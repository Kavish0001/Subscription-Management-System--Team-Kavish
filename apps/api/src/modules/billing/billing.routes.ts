import { InvoiceStatus, PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { createInvoiceSchema, paginationSchema, portalCheckoutSchema } from '@subscription/shared';
import { Router, type Request } from 'express';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';
import { buildSubscriptionPricing } from '../subscriptions/pricing.js';

export const billingRouter = Router();
type InvoiceIdParams = { id: string };

billingRouter.use(requireAuth);

function assertInvoiceAccess(
  auth: AuthenticatedRequest['auth'],
  ownerUserId: string | null | undefined,
) {
  if (auth?.role === 'portal_user' && ownerUserId !== auth.userId) {
    throw new AppError('You do not have permission to access this invoice', 403);
  }
}

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

billingRouter.get('/invoices', async (request, response) => {
  const auth = (request as AuthenticatedRequest).auth;
  const where =
    auth?.role === 'portal_user'
      ? {
          customerContact: {
            userId: auth.userId
          }
        }
      : undefined;

  const shouldPaginate = request.query.page !== undefined || request.query.pageSize !== undefined;

  if (shouldPaginate) {
    const { page, pageSize } = paginationSchema.parse(request.query);
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { subscriptionOrder: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.invoice.count({ where })
    ]);

    return response.json({ data: { items, page, pageSize, total } });
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { subscriptionOrder: true },
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: invoices });
});

billingRouter.get('/invoices/:id', async (request: Request<InvoiceIdParams>, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.id },
      include: {
        subscriptionOrder: true,
        customerContact: true,
        lines: {
          orderBy: { sortOrder: 'asc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    assertInvoiceAccess(auth, invoice.customerContact.userId);

    response.json({ data: invoice });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/checkout/complete', requireRole('portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const payload = portalCheckoutSchema.parse(request.body);
    const contact = await prisma.contact.findFirst({
      where: {
        userId: auth.userId,
        isActive: true
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    });

    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    const groupedLines = new Map<string, typeof payload.lines>();
    for (const line of payload.lines) {
      const key = line.recurringPlanId ?? 'no-plan';
      groupedLines.set(key, [...(groupedLines.get(key) ?? []), line]);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const subscriptionIds: string[] = [];
        const invoiceIds: string[] = [];

        for (const [planKey, lines] of groupedLines.entries()) {
          const recurringPlan =
            planKey === 'no-plan'
              ? null
              : await tx.recurringPlan.findUnique({
                  where: { id: planKey }
                });

          if (planKey !== 'no-plan' && !recurringPlan) {
            throw new AppError('Recurring plan not found', 404, 'RECURRING_PLAN_NOT_FOUND');
          }

          const now = new Date();
          const pricing = await buildSubscriptionPricing(tx, {
            recurringPlanId: recurringPlan?.id ?? null,
            discountCode: payload.discountCode,
            lines: lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity
            }))
          });

          const subscription = await tx.subscriptionOrder.create({
            data: {
              subscriptionNumber: `SUB-${Date.now()}-${subscriptionIds.length + 1}`,
              customerContactId: contact.id,
              salespersonUserId: auth.userId,
              recurringPlanId: recurringPlan?.id,
              sourceChannel: 'portal',
              status: SubscriptionStatus.confirmed,
              quotationDate: now,
              confirmedAt: now,
              startDate: now,
              nextInvoiceDate: nextInvoiceDateFromPlan(
                now,
                recurringPlan?.intervalUnit,
                recurringPlan?.intervalCount ?? 1,
              ),
              paymentTermLabel: 'Immediate payment',
              subtotalAmount: pricing.subtotalAmount,
              discountAmount: pricing.discountAmount,
              taxAmount: pricing.taxAmount,
              totalAmount: pricing.totalAmount,
              notes: payload.notes,
              lines: {
                create: pricing.lines
              }
            },
            include: {
              lines: true
            }
          });

          const invoice = await tx.invoice.create({
            data: {
              invoiceNumber: `INV-${Date.now()}-${invoiceIds.length + 1}`,
              subscriptionOrderId: subscription.id,
              customerContactId: contact.id,
              status: InvoiceStatus.confirmed,
              invoiceDate: now,
              dueDate: now,
              sourceLabel: 'Portal checkout',
              paymentTermLabel: subscription.paymentTermLabel,
              currencyCode: subscription.currencyCode,
              subtotalAmount: subscription.subtotalAmount,
              discountAmount: subscription.discountAmount,
              taxAmount: subscription.taxAmount,
              totalAmount: subscription.totalAmount,
              amountDue: subscription.totalAmount,
              lines: {
                create: subscription.lines.map((line) => ({
                  subscriptionOrderLineId: line.id,
                  productNameSnapshot: line.productNameSnapshot,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  discountAmount: line.discountAmount,
                  taxAmount: line.taxAmount,
                  lineTotal: line.lineTotal,
                  sortOrder: line.sortOrder
                }))
              }
            }
          });

          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              paymentReference: `PAY-${Date.now()}-${invoiceIds.length + 1}`,
              paymentMethod: payload.paymentMethod,
              provider: 'mock_gateway',
              status: PaymentStatus.succeeded,
              amount: subscription.totalAmount,
              currencyCode: subscription.currencyCode,
              paidAt: now
            }
          });

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              status: InvoiceStatus.paid,
              paidAmount: subscription.totalAmount,
              amountDue: new Prisma.Decimal(0),
              paidAt: now
            }
          });

          await tx.subscriptionOrder.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.active
            }
          });

          if (pricing.appliedDiscountRuleId) {
            await tx.discountRule.update({
              where: { id: pricing.appliedDiscountRuleId },
              data: {
                usageCount: {
                  increment: 1
                }
              }
            });
          }

          subscriptionIds.push(subscription.id);
          invoiceIds.push(invoice.id);
        }

        return {
          subscriptionIds,
          invoiceIds
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      },
    );

    response.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/invoices', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const payload = createInvoiceSchema.parse(request.body);

    const subscription = await prisma.subscriptionOrder.findUnique({
      where: { id: payload.subscriptionOrderId },
      include: {
        lines: true,
        customerContact: true,
        recurringPlan: true
      }
    });

    if (!subscription) {
      throw new AppError('Subscription order not found', 404);
    }

    if (auth?.role === 'portal_user') {
      if (subscription.customerContact.userId !== auth.userId) {
        throw new AppError('You do not have permission to invoice this subscription', 403);
      }

      if (!['confirmed', 'active'].includes(subscription.status)) {
        throw new AppError('Portal checkout can only invoice confirmed subscriptions', 409);
      }
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        subscriptionOrderId: subscription.id,
        status: {
          in: [InvoiceStatus.draft, InvoiceStatus.confirmed]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingInvoice) {
      return response.json({ data: existingInvoice });
    }

    const invoiceDate =
      subscription.status === SubscriptionStatus.active &&
      subscription.nextInvoiceDate &&
      subscription.nextInvoiceDate <= new Date()
        ? subscription.nextInvoiceDate
        : new Date();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now()}`,
        subscriptionOrderId: subscription.id,
        customerContactId: subscription.customerContactId,
        status: InvoiceStatus.draft,
        invoiceDate,
        dueDate: payload.dueDate,
        sourceLabel: payload.sourceLabel,
        paymentTermLabel: subscription.paymentTermLabel,
        currencyCode: subscription.currencyCode,
        subtotalAmount: subscription.subtotalAmount,
        discountAmount: subscription.discountAmount,
        taxAmount: subscription.taxAmount,
        totalAmount: subscription.totalAmount,
        amountDue: subscription.totalAmount,
        lines: {
          create: subscription.lines.map((line) => ({
            subscriptionOrderLineId: line.id,
            productNameSnapshot: line.productNameSnapshot,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountAmount: line.discountAmount,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
            sortOrder: line.sortOrder
          }))
        }
      },
      include: { lines: true }
    });

    if (
      subscription.recurringPlan &&
      subscription.nextInvoiceDate &&
      subscription.nextInvoiceDate <= invoiceDate
    ) {
      await prisma.subscriptionOrder.update({
        where: { id: subscription.id },
        data: {
          nextInvoiceDate: nextInvoiceDateFromPlan(
            subscription.nextInvoiceDate,
            subscription.recurringPlan.intervalUnit,
            subscription.recurringPlan.intervalCount,
          )
        }
      });
    }

    response.status(201).json({ data: invoice });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/invoices/:id/confirm', requireRole('admin', 'internal_user'), async (request: Request<InvoiceIdParams>, response, next) => {
  try {
    const id = request.params.id;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    if (existing.status !== InvoiceStatus.draft) {
      throw new AppError('Only draft invoices can be confirmed', 409);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.confirmed }
    });

    response.json({ data: invoice });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/invoices/:id/cancel', requireRole('admin', 'internal_user'), async (request: Request<InvoiceIdParams>, response, next) => {
  try {
    const id = request.params.id;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    if (existing.status === InvoiceStatus.paid) {
      throw new AppError('Paid invoices cannot be cancelled', 409);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.cancelled,
        cancelledAt: new Date()
      }
    });

    response.json({ data: invoice });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/invoices/:id/restore-draft', requireRole('admin', 'internal_user'), async (request: Request<InvoiceIdParams>, response, next) => {
  try {
    const id = request.params.id;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    if (existing.status !== InvoiceStatus.cancelled) {
      throw new AppError('Only cancelled invoices can be restored to draft', 409);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.draft,
        cancelledAt: null
      }
    });

    response.json({ data: invoice });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/payments/mock', async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const invoiceId = request.body.invoiceId as string | undefined;
    const paymentMethod = (request.body.paymentMethod as string | undefined) ?? 'mock-card';
    if (!invoiceId) {
      throw new AppError('invoiceId is required');
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscriptionOrder: {
          include: {
            recurringPlan: true
          }
        },
        customerContact: true
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    assertInvoiceAccess(auth, invoice.customerContact.userId);

    if (invoice.status !== InvoiceStatus.confirmed) {
      throw new AppError('Only confirmed invoices can be paid', 409);
    }

    if (Number(invoice.amountDue) <= 0) {
      throw new AppError('Invoice does not have an outstanding balance', 409);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            invoiceId,
            paymentReference: `PAY-${Date.now()}`,
            paymentMethod,
            provider: 'mock_gateway',
            status: PaymentStatus.succeeded,
            amount: new Prisma.Decimal(invoice.amountDue),
            currencyCode: invoice.currencyCode,
            paidAt: new Date()
          }
        });

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.paid,
            paidAmount: invoice.totalAmount,
            amountDue: new Prisma.Decimal(0),
            paidAt: new Date()
          }
        });

        const updatedSubscription = await tx.subscriptionOrder.update({
          where: { id: invoice.subscriptionOrderId },
          data: {
            status: SubscriptionStatus.active
          }
        });

        return {
          payment,
          invoice: updatedInvoice,
          subscription: updatedSubscription
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      },
    );

    response.status(201).json({
      data: result
    });
  } catch (error) {
    next(error);
  }
});
