import { InvoiceStatus, PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { createInvoiceSchema } from '@subscription/shared';
import { Router, type Request } from 'express';


import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

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

  const invoices = await prisma.invoice.findMany({
    where,
    include: { subscriptionOrder: true, payments: true },
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

billingRouter.post('/invoices', requireRole('admin', 'internal_user', 'portal_user'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const payload = createInvoiceSchema.parse(request.body);

    const subscription = await prisma.subscriptionOrder.findUnique({
      where: { id: payload.subscriptionOrderId },
      include: {
        lines: true,
        customerContact: true
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
          in: [InvoiceStatus.draft, InvoiceStatus.confirmed, InvoiceStatus.paid]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingInvoice) {
      return response.json({ data: existingInvoice });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now()}`,
        subscriptionOrderId: subscription.id,
        customerContactId: subscription.customerContactId,
        status: InvoiceStatus.draft,
        invoiceDate: new Date(),
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
        subscriptionOrder: true,
        customerContact: true
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    assertInvoiceAccess(auth, invoice.customerContact.userId);

    if (invoice.status === InvoiceStatus.paid) {
      throw new AppError('Invoice is already paid', 409);
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        paymentReference: `PAY-${Date.now()}`,
        paymentMethod,
        provider: 'mock_gateway',
        status: PaymentStatus.succeeded,
        amount: new Prisma.Decimal(invoice.amountDue),
        paidAt: new Date()
      }
    });

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.paid,
        paidAmount: invoice.totalAmount,
        amountDue: new Prisma.Decimal(0),
        paidAt: new Date()
      }
    });

    await prisma.subscriptionOrder.update({
      where: { id: invoice.subscriptionOrderId },
      data: {
        status: SubscriptionStatus.active
      }
    });

    response.status(201).json({
      data: {
        payment,
        invoice: updatedInvoice
      }
    });
  } catch (error) {
    next(error);
  }
});
