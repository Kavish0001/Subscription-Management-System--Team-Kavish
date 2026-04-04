import { Router } from 'express';

import { createSubscriptionSchema } from '@subscription/shared';
import { Prisma, SubscriptionStatus } from '@prisma/client';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

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

subscriptionsRouter.get('/', requireRole('admin', 'internal_user'), async (_request, response) => {
  const subscriptions = await prisma.subscriptionOrder.findMany({
    include: {
      customerContact: true,
      recurringPlan: true,
      invoices: true
    },
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: subscriptions });
});

subscriptionsRouter.post('/', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const payload = createSubscriptionSchema.parse(request.body);
    const actorId = request.auth?.userId;
    const salespersonUserId =
      request.auth?.role === 'portal_user' ? actorId : payload.salespersonUserId ?? actorId;

    if (!salespersonUserId) {
      throw new AppError('Salesperson could not be determined', 400);
    }

    const recurringPlan = payload.recurringPlanId
      ? await prisma.recurringPlan.findUnique({ where: { id: payload.recurringPlanId } })
      : null;

    const subtotal = payload.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    const now = new Date();

    const subscription = await prisma.subscriptionOrder.create({
      data: {
        subscriptionNumber: `SUB-${Date.now()}`,
        customerContactId: payload.customerContactId,
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
          create: payload.lines.map((line, index) => ({
            productId: line.productId,
            variantId: line.variantId,
            productNameSnapshot: `Line ${index + 1}`,
            quantity: line.quantity,
            unitPrice: new Prisma.Decimal(line.unitPrice),
            taxAmount: new Prisma.Decimal(line.quantity * line.unitPrice * 0.18),
            lineTotal: new Prisma.Decimal(line.quantity * line.unitPrice * 1.18),
            sortOrder: index
          }))
        }
      },
      include: { lines: true }
    });

    response.status(201).json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/send-quotation', requireRole('admin', 'internal_user'), async (request, response) => {
  const subscription = await prisma.subscriptionOrder.update({
    where: { id: request.params.id },
    data: {
      status: SubscriptionStatus.quotation_sent,
      quotationDate: new Date()
    }
  });

  response.json({ data: subscription });
});

subscriptionsRouter.post('/:id/confirm', requireRole('admin', 'internal_user'), async (request, response) => {
  const subscription = await prisma.subscriptionOrder.update({
    where: { id: request.params.id },
    data: {
      status: SubscriptionStatus.confirmed,
      confirmedAt: new Date()
    }
  });

  response.json({ data: subscription });
});
