import { Prisma, SubscriptionStatus } from '@prisma/client';
import { createSubscriptionSchema } from '@subscription/shared';
import { Router } from 'express';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

const subscriptionInclude = {
  customerContact: {
    include: {
      addresses: true
    }
  },
  recurringPlan: true,
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

    if (auth?.role === 'portal_user' && subscription.customerContact.userId !== auth.userId) {
      throw new AppError('You do not have permission to access this subscription', 403);
    }

    response.json({ data: subscription });
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

    const subtotal = payload.lines.reduce(
      (sum: number, line: (typeof payload.lines)[number]) => sum + line.quantity * line.unitPrice,
      0,
    );
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    const now = new Date();

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
        subtotalAmount: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(tax),
        totalAmount: new Prisma.Decimal(total),
        notes: payload.notes,
        lines: {
          create: payload.lines.map((line: (typeof payload.lines)[number], index: number) => ({
            productId: line.productId,
            variantId: line.variantId,
            productNameSnapshot: productsById.get(line.productId)?.name ?? `Line ${index + 1}`,
            quantity: line.quantity,
            unitPrice: new Prisma.Decimal(line.unitPrice),
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
        confirmedAt: new Date()
      }
    });

    response.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});
