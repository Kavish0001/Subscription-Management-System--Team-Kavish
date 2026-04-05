import { InvoiceStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { createSubscriptionSchema, paginationSchema } from '@subscription/shared';
import { Router } from 'express';
import { z } from 'zod';

import {
  addInterval,
  defaultQuotationExpiry,
  isCancellableSubscriptionStatus,
  isClosableSubscriptionStatus,
  isDeletableSubscriptionStatus,
  isEditableSubscriptionStatus,
  isPausableSubscriptionStatus,
  resolveAutoCloseDate,
  syncSubscriptionOperationalStatuses,
} from './lifecycle.js';
import { buildSubscriptionPricing } from './pricing.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthContext, type AuthenticatedRequest } from '../../middleware/auth.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

const subscriptionListInclude = {
  customerContact: {
    select: {
      id: true,
      userId: true,
      name: true,
      companyName: true
    }
  },
  recurringPlan: true,
  invoices: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      invoiceDate: true,
      dueDate: true,
      totalAmount: true,
      amountDue: true
    }
  }
} as const;

const subscriptionInclude = {
  customerContact: {
    include: {
      addresses: true
    }
  },
  recurringPlan: true,
  parentOrder: {
    select: {
      id: true,
      subscriptionNumber: true,
      status: true
    }
  },
  childOrders: {
    select: {
      id: true,
      subscriptionNumber: true,
      status: true,
      relationType: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  },
  invoices: {
    orderBy: { createdAt: 'desc' }
  },
  lines: {
    include: {
      product: true,
      variant: true
    },
    orderBy: { sortOrder: 'asc' }
  }
} as const;

const subscriptionListQuerySchema = paginationSchema.extend({
  contactId: z.string().uuid().optional(),
  status: z.string().optional()
});

const upsellSchema = z.object({
  productId: z.string().uuid().optional(),
  recurringPlanId: z.string().uuid().optional()
});

function hasPlanWindowStarted(startDate: Date | null | undefined, now = new Date()) {
  return !startDate || startDate <= now;
}

function hasPlanWindowEnded(endDate: Date | null | undefined, now = new Date()) {
  return Boolean(endDate && endDate < now);
}

function assertPlanSelectable(plan: {
  name: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  minimumQuantity: number;
}) {
  const now = new Date();

  if (!plan.isActive || !hasPlanWindowStarted(plan.startDate, now) || hasPlanWindowEnded(plan.endDate, now)) {
    throw new AppError(`Recurring plan ${plan.name} is not currently available`, 409, 'RECURRING_PLAN_UNAVAILABLE');
  }
}

function assertSubscriptionAccess(
  auth: AuthenticatedRequest['auth'],
  ownerUserId: string | null | undefined,
) {
  if (auth?.role === 'portal_user' && ownerUserId !== auth.userId) {
    throw new AppError('You do not have permission to access this subscription', 403);
  }
}

function resolveTemplateExpirationDate(
  template:
    | {
        isLastForever: boolean;
        durationCount: number | null;
        durationUnit: 'day' | 'week' | 'month' | 'year' | null;
      }
    | null
    | undefined,
  startDate: Date,
) {
  if (!template || template.isLastForever || !template.durationCount || !template.durationUnit) {
    return null;
  }

  return addInterval(startDate, template.durationCount, template.durationUnit);
}

function hasCompletedPurchase(
  subscription: {
    invoices: Array<{
      status: InvoiceStatus;
    }>;
  }
) {
  return subscription.invoices.some((invoice) => invoice.status === InvoiceStatus.paid);
}

async function createLifecycleSubscription(input: {
  subscriptionId: string;
  relationType: 'renewal' | 'upsell';
  sourceChannel: 'admin' | 'portal';
  actorRole: AuthContext['role'];
  actorUserId: string;
  overrideProductId?: string;
  overrideRecurringPlanId?: string;
}) {
  const existing = await prisma.subscriptionOrder.findUnique({
    where: { id: input.subscriptionId },
    include: {
      recurringPlan: true,
      customerContact: true,
      invoices: {
        select: {
          status: true
        }
      },
      lines: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  if (!existing) {
    throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  if (!hasCompletedPurchase(existing)) {
    throw new AppError('A completed purchase is required before creating subscription follow-up orders', 409, 'PURCHASE_REQUIRED');
  }

  const now = new Date();
  const targetPlanId = input.overrideRecurringPlanId ?? existing.recurringPlanId ?? undefined;
  const targetPlan = targetPlanId
    ? await prisma.recurringPlan.findUnique({ where: { id: targetPlanId } })
    : existing.recurringPlan;

  if (targetPlanId && !targetPlan) {
    throw new AppError('Recurring plan not found', 404, 'RECURRING_PLAN_NOT_FOUND');
  }

  if (targetPlan) {
    assertPlanSelectable(targetPlan);
  }

  let targetProductId = input.overrideProductId;
  if (input.relationType === 'upsell' && !targetProductId) {
    const currentProductIds = existing.lines.map((line) => line.productId);
    const alternativeProduct = await prisma.product.findFirst({
      where: {
        id: {
          notIn: currentProductIds
        },
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!alternativeProduct) {
      throw new AppError('No alternative product found for upsell', 409, 'UPSELL_PRODUCT_NOT_FOUND');
    }

    targetProductId = alternativeProduct.id;
  }

  const lines = await Promise.all(
    existing.lines.map(async (line, index) => {
      const lineProductId =
        input.relationType === 'upsell' && index === 0 ? targetProductId ?? line.productId : line.productId;
      const product = await prisma.product.findUnique({
        where: { id: lineProductId },
        include: {
          planPricing: true
        }
      });

      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      const unitPrice =
        Number(
          product.planPricing.find((pricing) => pricing.recurringPlanId === targetPlanId)?.overridePrice ??
            line.unitPrice
        ) || Number(line.unitPrice);
      const lineSubtotal = unitPrice * line.quantity;

      return {
        productId: product.id,
        variantId: line.variantId,
        productNameSnapshot: product.name,
        quantity: line.quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        taxAmount: new Prisma.Decimal(lineSubtotal * 0.18),
        lineTotal: new Prisma.Decimal(lineSubtotal * 1.18),
        sortOrder: line.sortOrder
      };
    })
  );

  const subtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  const child = await prisma.subscriptionOrder.create({
    data: {
      subscriptionNumber: `SUB-${Date.now()}`,
      customerContactId: existing.customerContactId,
      salespersonUserId: input.actorUserId,
      quotationTemplateId: existing.quotationTemplateId,
      recurringPlanId: targetPlanId,
      parentOrderId: existing.id,
      relationType: input.relationType,
      sourceChannel: input.sourceChannel,
      status: SubscriptionStatus.quotation,
      quotationDate: now,
      quotationExpiresAt: defaultQuotationExpiry(now),
      confirmedAt: null,
      startDate: null,
      nextInvoiceDate: null,
      paymentTermLabel: existing.paymentTermLabel,
      currencyCode: existing.currencyCode,
      subtotalAmount: new Prisma.Decimal(subtotal),
      taxAmount: new Prisma.Decimal(tax),
      totalAmount: new Prisma.Decimal(total),
      notes:
        input.relationType === 'renewal'
          ? `Renewed from ${existing.subscriptionNumber}`
          : `Upsold from ${existing.subscriptionNumber}`,
      lines: {
        create: lines
      }
    },
    include: subscriptionInclude
  });

  await prisma.subscriptionOrder.update({
    where: { id: existing.id },
    data:
      input.relationType === 'renewal'
        ? { renewalCount: { increment: 1 } }
        : { upsellCount: { increment: 1 } }
  });

  return child;
}

subscriptionsRouter.get('/', async (request, response) => {
  await syncSubscriptionOperationalStatuses(prisma);

  const auth = (request as AuthenticatedRequest).auth;
  const listQuery = subscriptionListQuerySchema.parse(request.query);
  const statusFilter =
    listQuery.status === 'active'
      ? SubscriptionStatus.active
      : listQuery.status && Object.values(SubscriptionStatus).includes(listQuery.status as SubscriptionStatus)
        ? (listQuery.status as SubscriptionStatus)
        : undefined;

  const where = {
    ...(auth?.role === 'portal_user'
      ? {
          customerContact: {
            userId: auth.userId
          }
        }
      : {}),
    ...(listQuery.contactId ? { customerContactId: listQuery.contactId } : {}),
    ...(statusFilter ? { status: statusFilter } : {})
  };

  const shouldPaginate = request.query.page !== undefined || request.query.pageSize !== undefined;

  if (shouldPaginate) {
    const { page, pageSize } = listQuery;
    const [items, total] = await Promise.all([
      prisma.subscriptionOrder.findMany({
        where,
        include: subscriptionListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.subscriptionOrder.count({ where })
    ]);

    return response.json({ data: { items, page, pageSize, total } });
  }

  const subscriptions = await prisma.subscriptionOrder.findMany({
    where,
    include: subscriptionListInclude,
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: subscriptions });
});

subscriptionsRouter.get('/:id', async (request, response, next) => {
  try {
    await syncSubscriptionOperationalStatuses(prisma);

    const auth = (request as AuthenticatedRequest).auth;
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);

    const subscription = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: subscriptionInclude
    });

    if (!subscription) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    assertSubscriptionAccess(auth, subscription.customerContact.userId);

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.delete('/:id', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);

    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: {
        invoices: {
          include: {
            payments: true,
            lines: true,
          },
        },
        lines: {
          include: {
            taxes: true,
            invoiceLines: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (!isDeletableSubscriptionStatus(existing.status)) {
      throw new AppError('Only draft or quotation subscriptions can be deleted', 409);
    }

    if (existing.invoices.length) {
      throw new AppError('Subscriptions with invoices or payments cannot be deleted', 409);
    }

    await prisma.$transaction(async (transaction) => {
      for (const line of existing.lines) {
        if (line.taxes.length) {
          await transaction.subscriptionOrderLineTax.deleteMany({
            where: {
              subscriptionOrderLineId: line.id,
            },
          });
        }
      }

      if (existing.lines.length) {
        await transaction.subscriptionOrderLine.deleteMany({
          where: {
            subscriptionOrderId: existing.id,
          },
        });
      }

      await transaction.subscriptionOrder.delete({
        where: { id: existing.id },
      });
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const payload = createSubscriptionSchema.parse(request.body);
    const actorId = authRequest.auth?.userId;
    const salespersonUserId =
      authRequest.auth?.role === 'portal_user' ? actorId : payload.salespersonUserId ?? actorId;

    if (!salespersonUserId) {
      throw new AppError('Salesperson could not be determined', 400);
    }

    let customerContactId = payload.customerContactId;
    if (authRequest.auth?.role === 'portal_user') {
      const actorContact = await prisma.contact.findFirst({
        where: {
          id: payload.customerContactId,
          userId: actorId,
          isActive: true
        }
      });

      if (!actorContact) {
        throw new AppError('You can only use your own contact for portal checkout', 403);
      }

      customerContactId = actorContact.id;
    }

    const customerContact = await prisma.contact.findUnique({
      where: { id: customerContactId }
    });
    if (!customerContact) {
      throw new AppError('Customer contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (payload.salespersonUserId) {
      const salesperson = await prisma.user.findUnique({
        where: { id: payload.salespersonUserId }
      });
      if (!salesperson) {
        throw new AppError('Salesperson not found', 404, 'USER_NOT_FOUND');
      }
    }

    const quotationTemplate = payload.quotationTemplateId
      ? await prisma.quotationTemplate.findUnique({
          where: { id: payload.quotationTemplateId }
        })
      : null;

    if (payload.quotationTemplateId && !quotationTemplate) {
      throw new AppError('Quotation template not found', 404, 'QUOTATION_TEMPLATE_NOT_FOUND');
    }

    const resolvedRecurringPlanId = payload.recurringPlanId ?? quotationTemplate?.recurringPlanId ?? null;
    if (!resolvedRecurringPlanId) {
      throw new AppError('Recurring plan is required', 400, 'RECURRING_PLAN_REQUIRED');
    }

    const resolvedPaymentTermLabel = payload.paymentTermLabel?.trim() || quotationTemplate?.paymentTermLabel;
    if (!resolvedPaymentTermLabel) {
      throw new AppError('Payment term is required', 400, 'PAYMENT_TERM_REQUIRED');
    }

    const recurringPlan = await prisma.recurringPlan.findUnique({ where: { id: resolvedRecurringPlanId } });
    if (!recurringPlan) {
      throw new AppError('Recurring plan not found', 404, 'RECURRING_PLAN_NOT_FOUND');
    }
    assertPlanSelectable(recurringPlan);

    if (payload.lines.some((line) => line.quantity < recurringPlan.minimumQuantity)) {
      throw new AppError(
        `Subscription quantity must be at least ${recurringPlan.minimumQuantity} for the selected recurring plan`,
        409,
        'MINIMUM_QUANTITY_NOT_MET'
      );
    }

    const productIds = [...new Set(payload.lines.map((line) => line.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (products.length !== productIds.length) {
      throw new AppError('One or more products could not be found', 404, 'PRODUCT_NOT_FOUND');
    }

    const now = new Date();
    const quotationExpiry = quotationTemplate
      ? (() => {
          const expiry = new Date(now);
          expiry.setDate(expiry.getDate() + quotationTemplate.validityDays);
          return expiry;
        })()
      : defaultQuotationExpiry(now);
    const pricing = await buildSubscriptionPricing(prisma, {
      recurringPlanId: resolvedRecurringPlanId,
      discountCode: payload.discountCode,
      lines: payload.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity
      }))
    });

    const subscription = await prisma.subscriptionOrder.create({
      data: {
        subscriptionNumber: `SUB-${Date.now()}`,
        customerContactId,
        salespersonUserId,
        quotationTemplateId: payload.quotationTemplateId,
        recurringPlanId: resolvedRecurringPlanId,
        sourceChannel: payload.sourceChannel,
        status: SubscriptionStatus.quotation,
        quotationDate: now,
        quotationExpiresAt: quotationExpiry,
        confirmedAt: null,
        startDate: null,
        nextInvoiceDate: null,
        paymentTermLabel: resolvedPaymentTermLabel,
        subtotalAmount: pricing.subtotalAmount,
        discountAmount: pricing.discountAmount,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        notes: payload.notes,
        lines: {
          create: pricing.lines
        }
      },
      include: subscriptionInclude
    });

    response.status(201).json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/send-quotation', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: {
        lines: true,
        recurringPlan: true
      }
    });
    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (!isEditableSubscriptionStatus(existing.status)) {
      throw new AppError('Only editable subscriptions can be sent as quotations', 409);
    }

    if (!existing.lines.length) {
      throw new AppError('Add at least one order line before sending the quotation', 409);
    }

    if (!existing.recurringPlan) {
      throw new AppError('Recurring plan is required before sending the quotation', 409);
    }

    assertPlanSelectable(existing.recurringPlan);

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.quotation_sent,
        quotationDate: new Date(),
        quotationExpiresAt: existing.quotationExpiresAt ?? defaultQuotationExpiry()
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/confirm', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: {
        customerContact: true,
        recurringPlan: true,
        quotationTemplate: true,
        lines: true
      }
    });
    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    assertSubscriptionAccess(auth, existing.customerContact.userId);

    if (!isEditableSubscriptionStatus(existing.status)) {
      throw new AppError('Only draft or quotation subscriptions can be confirmed', 409);
    }

    if (existing.quotationExpiresAt && existing.quotationExpiresAt < new Date()) {
      throw new AppError('Quotation has expired and must be revised before confirmation', 409, 'QUOTATION_EXPIRED');
    }

    if (!existing.paymentTermLabel?.trim()) {
      throw new AppError('Payment term is required before confirmation', 409);
    }

    if (!existing.recurringPlan) {
      throw new AppError('Recurring plan is required before confirmation', 409);
    }

    const recurringPlan = existing.recurringPlan;
    assertPlanSelectable(recurringPlan);

    if (!existing.lines.length) {
      throw new AppError('Add at least one order line before confirmation', 409);
    }

    if (existing.lines.some((line) => line.quantity < recurringPlan.minimumQuantity)) {
      throw new AppError(
        `Subscription quantity must be at least ${recurringPlan.minimumQuantity} for the selected recurring plan`,
        409,
        'MINIMUM_QUANTITY_NOT_MET'
      );
    }

    const confirmedAt = new Date();
    const startDate = existing.startDate ?? confirmedAt;
    const expirationDate =
      resolveTemplateExpirationDate(existing.quotationTemplate, startDate) ??
      resolveAutoCloseDate({
        startDate,
        autoCloseEnabled: recurringPlan.autoCloseEnabled,
        autoCloseAfterCount: recurringPlan.autoCloseAfterCount,
        autoCloseAfterUnit: recurringPlan.autoCloseAfterUnit
      });
    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.confirmed,
        confirmedAt,
        startDate,
        nextInvoiceDate: startDate,
        expirationDate
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/cancel', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (!isCancellableSubscriptionStatus(existing.status)) {
      throw new AppError('This subscription can no longer be cancelled', 409);
    }

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.cancelled
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/close', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: {
        customerContact: true,
        recurringPlan: true
      }
    });
    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    assertSubscriptionAccess(auth, existing.customerContact.userId);

    if (existing.recurringPlan && !existing.recurringPlan.isClosable) {
      throw new AppError('This recurring plan does not allow closure', 409);
    }

    if (!isClosableSubscriptionStatus(existing.status)) {
      throw new AppError('Only confirmed or live subscriptions can be closed', 409);
    }

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.closed,
        expirationDate: new Date()
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/pause', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: {
        customerContact: true,
        recurringPlan: true
      }
    });

    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    assertSubscriptionAccess(auth, existing.customerContact.userId);

    if (!existing.recurringPlan?.isPausable) {
      throw new AppError('This recurring plan does not allow pausing', 409);
    }

    if (!isPausableSubscriptionStatus(existing.status)) {
      throw new AppError('Only confirmed or live subscriptions can be paused', 409);
    }

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.paused
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/resume', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: {
        customerContact: true,
        recurringPlan: true
      }
    });

    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    assertSubscriptionAccess(auth, existing.customerContact.userId);

    if (!existing.recurringPlan?.isPausable) {
      throw new AppError('This recurring plan does not allow pausing', 409);
    }

    if (existing.status !== SubscriptionStatus.paused) {
      throw new AppError('Only paused subscriptions can be resumed', 409);
    }

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: existing.startDate && existing.startDate <= new Date() ? SubscriptionStatus.active : SubscriptionStatus.confirmed
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/reopen', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (existing.status !== SubscriptionStatus.closed) {
      throw new AppError('Only closed subscriptions can be reopened', 409);
    }

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.draft,
        expirationDate: null
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/renew', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: { customerContact: true }
    });

    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    assertSubscriptionAccess(auth, existing.customerContact.userId);

    const child = await createLifecycleSubscription({
      subscriptionId: id,
      relationType: 'renewal',
      sourceChannel: auth.role === 'portal_user' ? 'portal' : 'admin',
      actorRole: auth.role,
      actorUserId: auth.userId
    });

    response.status(201).json({ data: child });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/upsell', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({
      where: { id },
      include: { customerContact: true }
    });

    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    assertSubscriptionAccess(auth, existing.customerContact.userId);

    const payload = upsellSchema.parse(request.body ?? {});
    const child = await createLifecycleSubscription({
      subscriptionId: id,
      relationType: 'upsell',
      sourceChannel: auth.role === 'portal_user' ? 'portal' : 'admin',
      actorRole: auth.role,
      actorUserId: auth.userId,
      overrideProductId: payload.productId,
      overrideRecurringPlanId: payload.recurringPlanId
    });

    response.status(201).json({ data: child });
  } catch (error) {
    next(error);
  }
});
