import { InvoiceStatus, PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { createInvoiceSchema, paginationSchema, portalCheckoutSchema, portalCheckoutSummarySchema } from '@subscription/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { createRazorpayOrder, toPaise, verifyRazorpayPaymentSignature } from '../../lib/razorpay.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';
import { addInterval, isInvoiceEligibleStatus, resolveAutoCloseDate, syncSubscriptionOperationalStatuses } from '../subscriptions/lifecycle.js';
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
  if (!unit) {
    return new Date(date);
  }

  return addInterval(date, count, unit as 'day' | 'week' | 'month' | 'year');
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

const razorpayOrderCreateSchema = z.discriminatedUnion('purpose', [
  z.object({
    purpose: z.literal('checkout'),
    paymentMethod: z.string().min(2).max(60),
    discountCode: z.string().max(50).optional(),
    notes: z.string().max(4000).optional(),
    lines: portalCheckoutSchema.shape.lines
  }),
  z.object({
    purpose: z.literal('invoice'),
    invoiceId: z.string().uuid(),
    paymentMethod: z.string().min(2).max(60).default('card')
  })
]);

const razorpayVerifySchema = z.object({
  purpose: z.enum(['checkout', 'invoice']),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

function groupPortalCheckoutLines(lines: z.infer<typeof portalCheckoutSchema>['lines']) {
  const groupedLines = new Map<string, typeof lines>();

  for (const line of lines) {
    const key = line.recurringPlanId ?? 'no-plan';
    groupedLines.set(key, [...(groupedLines.get(key) ?? []), line]);
  }

  return groupedLines;
}

function paymentMetadataToObject(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {} as Record<string, unknown>;
  }

  return metadata as Record<string, unknown>;
}

async function resolveCheckoutContact(auth: NonNullable<AuthenticatedRequest['auth']>) {
  const contact =
    (await prisma.contact.findFirst({
      where: {
        userId: auth.userId,
        isActive: true,
        isDefault: true
      }
    })) ??
    (await prisma.contact.findFirst({
      where: {
        userId: auth.userId,
        isActive: true
      },
      orderBy: [{ createdAt: 'asc' }]
    }));

  if (contact) {
    return contact;
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      address: true
    }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const created = await prisma.contact.create({
    data: {
      userId: user.id,
      name: user.name?.trim() || user.email,
      email: user.email,
      phone: user.phone,
      address: user.address,
      isDefault: true
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultContactId: created.id
    }
  });

  return created;
}

async function buildPortalCheckoutSummary(
  db: typeof prisma,
  payload: {
    discountCode?: string;
    lines: Array<{
      productId: string;
      recurringPlanId?: string | null;
      variantId?: string;
      quantity: number;
    }>;
  },
) {
  try {
    const groupedLines = new Map<string, typeof payload.lines>();
    for (const line of payload.lines) {
      const key = line.recurringPlanId ?? 'no-plan';
      groupedLines.set(key, [...(groupedLines.get(key) ?? []), line]);
    }

    const items: Array<{
      productId: string;
      recurringPlanId: string | null;
      variantId: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }> = [];

    let subtotalAmount = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    for (const [planKey, lines] of groupedLines.entries()) {
      const recurringPlan =
        planKey === 'no-plan'
          ? null
          : await db.recurringPlan.findUnique({
              where: { id: planKey }
            });

      if (planKey !== 'no-plan' && !recurringPlan) {
        throw new AppError('Recurring plan not found', 404, 'RECURRING_PLAN_NOT_FOUND');
      }

      const pricing = await buildSubscriptionPricing(db, {
        recurringPlanId: recurringPlan?.id ?? null,
        discountCode: payload.discountCode,
        lines: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity
        }))
      });

      subtotalAmount += Number(pricing.subtotalAmount);
      discountAmount += Number(pricing.discountAmount);
      taxAmount += Number(pricing.taxAmount);
      totalAmount += Number(pricing.totalAmount);

      pricing.lines
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .forEach((line, index) => {
          items.push({
            productId: line.productId,
            recurringPlanId: recurringPlan?.id ?? null,
            variantId: line.variantId ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountAmount: line.discountAmount,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal
          });

          if (!lines[index]) {
            throw new AppError('Checkout summary line mismatch', 500);
          }
        });
    }

    return {
      items,
      subtotalAmount: roundMoney(subtotalAmount),
      discountAmount: roundMoney(discountAmount),
      taxAmount: roundMoney(taxAmount),
      totalAmount: roundMoney(totalAmount),
      appliedDiscountCode: payload.discountCode?.trim().toUpperCase() || null,
      hasDiscount: discountAmount > 0
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to build checkout summary', 500);
  }
}

billingRouter.get('/invoices', async (request, response) => {
  await syncSubscriptionOperationalStatuses(prisma);

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
    await syncSubscriptionOperationalStatuses(prisma);

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

billingRouter.post('/checkout/summary', async (request, response, next) => {
  try {
    const payload = portalCheckoutSummarySchema.parse(request.body);
    const summary = await buildPortalCheckoutSummary(prisma, payload);

    response.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/payments/razorpay/order', async (request, response, next) => {
  try {
    await syncSubscriptionOperationalStatuses(prisma);

    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const payload = razorpayOrderCreateSchema.parse(request.body);

    if (payload.purpose === 'checkout') {
      const contact = await resolveCheckoutContact(auth);

      const summary = await buildPortalCheckoutSummary(prisma, {
        discountCode: payload.discountCode,
        lines: payload.lines
      });

      if (Number(summary.totalAmount) <= 0) {
        throw new AppError('Checkout total must be greater than zero', 409);
      }

      const razorpayOrder = await createRazorpayOrder({
        amountPaise: toPaise(Number(summary.totalAmount)),
        currency: 'INR',
        receipt: `checkout-${Date.now()}`,
        notes: {
          source: 'portal_checkout',
          userId: auth.userId
        }
      });

      const groupedLines = groupPortalCheckoutLines(payload.lines);

      const created = await prisma.$transaction(
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
                sourceChannel: auth.role === 'portal_user' ? 'portal' : 'admin',
                status: SubscriptionStatus.confirmed,
                quotationDate: now,
                quotationExpiresAt: now,
                confirmedAt: now,
                startDate: now,
                nextInvoiceDate: now,
                expirationDate: recurringPlan
                  ? resolveAutoCloseDate({
                      startDate: now,
                      autoCloseEnabled: recurringPlan.autoCloseEnabled,
                      autoCloseAfterCount: recurringPlan.autoCloseAfterCount,
                      autoCloseAfterUnit: recurringPlan.autoCloseAfterUnit
                    })
                  : null,
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
                paymentReference: `RZP-PENDING-${Date.now()}-${invoiceIds.length + 1}`,
                paymentMethod: payload.paymentMethod,
                provider: 'razorpay',
                status: PaymentStatus.pending,
                amount: subscription.totalAmount,
                currencyCode: subscription.currencyCode,
                providerTransactionId: razorpayOrder.id,
                metadataJson: {
                  purpose: 'checkout',
                  razorpayOrderId: razorpayOrder.id,
                  paymentMethod: payload.paymentMethod,
                  appliedDiscountRuleId: pricing.appliedDiscountRuleId
                }
              }
            });

            subscriptionIds.push(subscription.id);
            invoiceIds.push(invoice.id);
          }

          return { subscriptionIds, invoiceIds };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );

      return response.status(201).json({
        data: {
          purpose: 'checkout',
          keyId: env.RAZORPAY_KEY_ID,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          merchantName: 'Veltrix',
          description: 'Subscription checkout',
          customer: {
            name: contact.name,
            email: contact.email,
            contact: contact.phone
          },
          subscriptionIds: created.subscriptionIds,
          invoiceIds: created.invoiceIds
        }
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: payload.invoiceId },
      include: {
        subscriptionOrder: {
          include: {
            recurringPlan: true
          }
        },
        customerContact: true,
        payments: {
          where: {
            provider: 'razorpay',
            status: PaymentStatus.pending
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    assertInvoiceAccess(auth, invoice.customerContact.userId);

    if (invoice.status !== InvoiceStatus.confirmed) {
      throw new AppError('Only confirmed invoices can be paid', 409);
    }

    if (Number(invoice.amountDue) <= 0) {
      throw new AppError('Invoice does not have an outstanding balance', 409);
    }

    const existingPendingPayment = invoice.payments[0];
    const razorpayOrderId =
      typeof existingPendingPayment?.providerTransactionId === 'string'
        ? existingPendingPayment.providerTransactionId
        : null;

    if (!razorpayOrderId) {
      const razorpayOrder = await createRazorpayOrder({
        amountPaise: toPaise(Number(invoice.amountDue)),
        currency: invoice.currencyCode,
        receipt: `invoice-${invoice.invoiceNumber}`,
        notes: {
          source: 'invoice_payment',
          invoiceId: invoice.id
        }
      });

      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentReference: `RZP-PENDING-${Date.now()}`,
          paymentMethod: payload.paymentMethod,
          provider: 'razorpay',
          status: PaymentStatus.pending,
          amount: new Prisma.Decimal(invoice.amountDue),
          currencyCode: invoice.currencyCode,
          providerTransactionId: razorpayOrder.id,
          metadataJson: {
            purpose: 'invoice',
            razorpayOrderId: razorpayOrder.id,
            paymentMethod: payload.paymentMethod
          }
        }
      });

      return response.status(201).json({
        data: {
          purpose: 'invoice',
          keyId: env.RAZORPAY_KEY_ID,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          merchantName: 'Veltrix',
          description: `Invoice ${invoice.invoiceNumber}`,
          customer: {
            name: invoice.customerContact.name,
            email: invoice.customerContact.email,
            contact: invoice.customerContact.phone
          },
          subscriptionIds: [invoice.subscriptionOrderId],
          invoiceIds: [invoice.id]
        }
      });
    }

    return response.status(201).json({
      data: {
        purpose: 'invoice',
        keyId: env.RAZORPAY_KEY_ID,
        orderId: razorpayOrderId,
        amount: toPaise(Number(invoice.amountDue)),
        currency: invoice.currencyCode,
        merchantName: 'Veltrix',
        description: `Invoice ${invoice.invoiceNumber}`,
        customer: {
          name: invoice.customerContact.name,
          email: invoice.customerContact.email,
          contact: invoice.customerContact.phone
        },
        subscriptionIds: [invoice.subscriptionOrderId],
        invoiceIds: [invoice.id]
      }
    });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/payments/razorpay/verify', async (request, response, next) => {
  try {
    await syncSubscriptionOperationalStatuses(prisma);

    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const payload = razorpayVerifySchema.parse(request.body);

    if (
      !verifyRazorpayPaymentSignature({
        orderId: payload.razorpayOrderId,
        paymentId: payload.razorpayPaymentId,
        signature: payload.razorpaySignature
      })
    ) {
      throw new AppError('Invalid Razorpay payment signature', 400, 'RAZORPAY_SIGNATURE_INVALID');
    }

    const existingPayments = await prisma.payment.findMany({
      where: {
        provider: 'razorpay',
        providerTransactionId: payload.razorpayOrderId
      },
      include: {
        invoice: {
          include: {
            customerContact: true,
            subscriptionOrder: {
              include: {
                recurringPlan: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (existingPayments.length === 0) {
      throw new AppError('Razorpay payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }

    existingPayments.forEach((payment) => {
      assertInvoiceAccess(auth, payment.invoice.customerContact.userId);
    });

    const alreadyCaptured = existingPayments.every((payment) => payment.status === PaymentStatus.succeeded);
    if (alreadyCaptured) {
      return response.json({
        data: {
          subscriptionIds: Array.from(new Set(existingPayments.map((payment) => payment.invoice.subscriptionOrderId))),
          invoiceIds: Array.from(new Set(existingPayments.map((payment) => payment.invoiceId)))
        }
      });
    }

    const now = new Date();

    const result = await prisma.$transaction(
      async (tx) => {
        const subscriptionIds = new Set<string>();
        const invoiceIds = new Set<string>();
        const discountRuleIds = new Set<string>();

        for (const [index, payment] of existingPayments.entries()) {
          const metadata = paymentMetadataToObject(payment.metadataJson);
          const appliedDiscountRuleId = typeof metadata.appliedDiscountRuleId === 'string' ? metadata.appliedDiscountRuleId : null;
          if (appliedDiscountRuleId) {
            discountRuleIds.add(appliedDiscountRuleId);
          }

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              paymentReference: `RZP-${payload.razorpayPaymentId}-${index + 1}`,
              provider: 'razorpay',
              status: PaymentStatus.succeeded,
              paidAt: now,
              metadataJson: {
                ...metadata,
                purpose: payload.purpose,
                razorpayOrderId: payload.razorpayOrderId,
                razorpayPaymentId: payload.razorpayPaymentId,
                razorpaySignature: payload.razorpaySignature,
                verifiedAt: now.toISOString()
              }
            }
          });

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              status: InvoiceStatus.paid,
              paidAmount: payment.invoice.totalAmount,
              amountDue: new Prisma.Decimal(0),
              paidAt: now
            }
          });

          const nextSubscriptionState =
            payment.invoice.subscriptionOrder.startDate && payment.invoice.subscriptionOrder.startDate <= now
              ? SubscriptionStatus.in_progress
              : SubscriptionStatus.confirmed;

          await tx.subscriptionOrder.update({
            where: { id: payment.invoice.subscriptionOrderId },
            data: {
              status: nextSubscriptionState,
              ...(payload.purpose === 'checkout'
                ? {
                    nextInvoiceDate: payment.invoice.subscriptionOrder.recurringPlan
                      ? nextInvoiceDateFromPlan(
                          now,
                          payment.invoice.subscriptionOrder.recurringPlan.intervalUnit,
                          payment.invoice.subscriptionOrder.recurringPlan.intervalCount ?? 1
                        )
                      : null
                  }
                : {})
            }
          });

          subscriptionIds.add(payment.invoice.subscriptionOrderId);
          invoiceIds.add(payment.invoiceId);
        }

        for (const discountRuleId of discountRuleIds) {
          await tx.discountRule.update({
            where: { id: discountRuleId },
            data: {
              usageCount: {
                increment: 1
              }
            }
          });
        }

        return {
          subscriptionIds: [...subscriptionIds],
          invoiceIds: [...invoiceIds]
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );

    response.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

billingRouter.post('/checkout/complete', requireRole('portal_user'), async (_request, _response, next) => {
  next(new AppError('Direct checkout completion is disabled. Use Razorpay payment verification.', 409));
});

billingRouter.post('/invoices', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    await syncSubscriptionOperationalStatuses(prisma);

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

      if (!isInvoiceEligibleStatus(subscription.status)) {
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

    if (!isInvoiceEligibleStatus(subscription.status)) {
      throw new AppError('Invoices can only be created for confirmed or live subscriptions', 409);
    }

    if (!subscription.nextInvoiceDate) {
      throw new AppError('Next invoice date is not available yet for this subscription', 409);
    }

    if (subscription.nextInvoiceDate > new Date()) {
      throw new AppError('Invoice for this billing cycle is not due yet', 409, 'INVOICE_NOT_DUE');
    }

    const invoiceDate = subscription.nextInvoiceDate;

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

    if (subscription.recurringPlan) {
      await prisma.subscriptionOrder.update({
        where: { id: subscription.id },
        data: {
          nextInvoiceDate: nextInvoiceDateFromPlan(
            invoiceDate,
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

billingRouter.post('/payments/mock', async (_request, _response, next) => {
  next(new AppError('Mock payments are disabled. Use Razorpay payment flow instead.', 410));
});
