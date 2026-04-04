import { Prisma, SubscriptionStatus } from '@prisma/client';
import { createSubscriptionSchema } from '@subscription/shared';
import { Router } from 'express';
import { z } from 'zod';

import { buildSubscriptionPricing } from './pricing.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthContext, type AuthenticatedRequest } from '../../middleware/auth.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

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

const upsellSchema = z.object({
  productId: z.string().uuid().optional(),
  recurringPlanId: z.string().uuid().optional()
});

function nextInvoiceDateFromPlan(date: Date, unit?: string | null, count = 1) {
  const next = new Date(date);

  switch (unit) {
    case 'day':
      next.setDate(next.getDate() + count);
      break;
    case 'week':
      next.setDate(next.getDate() + 7 * count);
      break;
    case 'month':
      next.setMonth(next.getMonth() + count);
      break;
    case 'year':
      next.setFullYear(next.getFullYear() + count);
      break;
  }

  return next;
}

function assertSubscriptionAccess(
  auth: AuthenticatedRequest['auth'],
  ownerUserId: string | null | undefined,
) {
  if (auth?.role === 'portal_user' && ownerUserId !== auth.userId) {
    throw new AppError('You do not have permission to access this subscription', 403);
  }
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
      lines: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  if (!existing) {
    throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  if (!['confirmed', 'active', 'closed'].includes(existing.status)) {
    throw new AppError('Only confirmed or active subscriptions can create follow-up orders', 409);
  }

  if (input.relationType === 'renewal' && existing.recurringPlan && !existing.recurringPlan.isRenewable) {
    throw new AppError('This recurring plan does not allow renewal', 409);
  }

  const now = new Date();
  const targetPlanId = input.overrideRecurringPlanId ?? existing.recurringPlanId ?? undefined;
  const targetPlan = targetPlanId
    ? await prisma.recurringPlan.findUnique({ where: { id: targetPlanId } })
    : existing.recurringPlan;

  if (targetPlanId && !targetPlan) {
    throw new AppError('Recurring plan not found', 404, 'RECURRING_PLAN_NOT_FOUND');
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
  const nextStatus =
    input.actorRole === 'portal_user' ? SubscriptionStatus.confirmed : SubscriptionStatus.draft;

  const child = await prisma.subscriptionOrder.create({
    data: {
      subscriptionNumber: `SUB-${Date.now()}`,
      customerContactId: existing.customerContactId,
      salespersonUserId: input.actorUserId,
      recurringPlanId: targetPlanId,
      parentOrderId: existing.id,
      relationType: input.relationType,
      sourceChannel: input.sourceChannel,
      status: nextStatus,
      quotationDate: now,
      confirmedAt: nextStatus === SubscriptionStatus.confirmed ? now : null,
      startDate: nextStatus === SubscriptionStatus.confirmed ? now : null,
      nextInvoiceDate: nextInvoiceDateFromPlan(
        now,
        targetPlan?.intervalUnit ?? existing.recurringPlan?.intervalUnit,
        targetPlan?.intervalCount ?? existing.recurringPlan?.intervalCount ?? 1
      ),
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
  const auth = (request as AuthenticatedRequest).auth;
  const where =
    auth?.role === 'portal_user'
      ? {
          customerContact: {
            userId: auth.userId
          }
        }
      : undefined;

  const subscriptions = await prisma.subscriptionOrder.findMany({
    where,
    include: subscriptionInclude,
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: subscriptions });
});

subscriptionsRouter.get('/:id', async (request, response, next) => {
  try {
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

    await prisma.$transaction(async (transaction) => {
      for (const invoice of existing.invoices) {
        if (invoice.payments.length) {
          await transaction.payment.deleteMany({
            where: {
              invoiceId: invoice.id,
            },
          });
        }

        if (invoice.lines.length) {
          await transaction.invoiceLine.deleteMany({
            where: {
              invoiceId: invoice.id,
            },
          });
        }
      }

      if (existing.invoices.length) {
        await transaction.invoice.deleteMany({
          where: {
            subscriptionOrderId: existing.id,
          },
        });
      }

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

    const recurringPlan = payload.recurringPlanId
      ? await prisma.recurringPlan.findUnique({ where: { id: payload.recurringPlanId } })
      : null;
    if (payload.recurringPlanId && !recurringPlan) {
      throw new AppError('Recurring plan not found', 404, 'RECURRING_PLAN_NOT_FOUND');
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
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (products.length !== productIds.length) {
      throw new AppError('One or more products could not be found', 404, 'PRODUCT_NOT_FOUND');
    }

    const now = new Date();
    const pricing =
      authRequest.auth?.role === 'portal_user'
        ? await buildSubscriptionPricing(prisma, {
            recurringPlanId: payload.recurringPlanId,
            discountCode: payload.discountCode,
            lines: payload.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity
            }))
          })
        : null;

    const subscription = await prisma.subscriptionOrder.create({
      data: {
        subscriptionNumber: `SUB-${Date.now()}`,
        customerContactId,
        salespersonUserId,
        quotationTemplateId: payload.quotationTemplateId,
        recurringPlanId: payload.recurringPlanId,
        sourceChannel: payload.sourceChannel,
        status:
          payload.sourceChannel === 'portal' ? SubscriptionStatus.confirmed : SubscriptionStatus.draft,
        quotationDate: now,
        confirmedAt: payload.sourceChannel === 'portal' ? now : null,
        startDate: now,
        nextInvoiceDate: nextInvoiceDateFromPlan(
          now,
          recurringPlan?.intervalUnit,
          recurringPlan?.intervalCount ?? 1,
        ),
        paymentTermLabel: payload.paymentTermLabel,
        subtotalAmount:
          pricing?.subtotalAmount ??
          new Prisma.Decimal(
            payload.lines.reduce(
              (sum: number, line: (typeof payload.lines)[number]) => sum + line.quantity * line.unitPrice,
              0,
            ),
          ),
        discountAmount: pricing?.discountAmount ?? new Prisma.Decimal(0),
        taxAmount:
          pricing?.taxAmount ??
          new Prisma.Decimal(
            payload.lines.reduce(
              (sum: number, line: (typeof payload.lines)[number]) => sum + line.quantity * line.unitPrice * 0.18,
              0,
            ),
          ),
        totalAmount:
          pricing?.totalAmount ??
          new Prisma.Decimal(
            payload.lines.reduce(
              (sum: number, line: (typeof payload.lines)[number]) => sum + line.quantity * line.unitPrice * 1.18,
              0,
            ),
          ),
        notes: payload.notes,
        lines: {
          create:
            pricing?.lines ??
            payload.lines.map((line: (typeof payload.lines)[number], index: number) => ({
              productId: line.productId,
              variantId: line.variantId,
              productNameSnapshot: productsById.get(line.productId)?.name ?? `Line ${index + 1}`,
              quantity: line.quantity,
              unitPrice: new Prisma.Decimal(line.unitPrice),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(line.quantity * line.unitPrice * 0.18),
              lineTotal: new Prisma.Decimal(line.quantity * line.unitPrice * 1.18),
              sortOrder: index
            }))
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
    const existing = await prisma.subscriptionOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.quotation_sent,
        quotationDate: new Date()
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/confirm', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.subscriptionOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Subscription order not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const subscription = await prisma.subscriptionOrder.update({
      where: { id },
      data: {
        status: SubscriptionStatus.confirmed,
        confirmedAt: new Date(),
        startDate: existing.startDate ?? new Date()
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
