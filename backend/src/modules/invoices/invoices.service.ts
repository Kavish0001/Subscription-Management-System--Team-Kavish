import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

const invInclude = {
  contact: true,
  lines: true,
  payments: true,
  subscriptionOrder: { include: { recurringPlan: true } },
};

async function nextInvNumber() {
  const count = await prisma.invoice.count();
  return `INV-${String(count + 1).padStart(4, '0')}`;
}

export async function listInvoices() {
  return prisma.invoice.findMany({ include: { contact: true }, orderBy: { createdAt: 'desc' } });
}

export async function getInvoiceById(id: string) {
  const inv = await prisma.invoice.findFirst({ where: { OR: [{ id }, { invoiceNumber: id }] }, include: invInclude });
  if (!inv) throw createError('Invoice not found', 404);
  return inv;
}

export async function createInvoiceFromSubscription(subscriptionOrderId: string) {
  const sub = await prisma.subscriptionOrder.findUnique({
    where: { id: subscriptionOrderId },
    include: { lines: true, paymentTerm: { include: { lines: true } } },
  });
  if (!sub) throw createError('Subscription not found', 404);

  const invoiceNumber = await nextInvNumber();
  const dueDate = sub.paymentTerm?.lines[0]?.afterDays
    ? new Date(Date.now() + sub.paymentTerm.lines[0].afterDays * 86400000)
    : new Date();

  return prisma.invoice.create({
    data: {
      invoiceNumber, subscriptionOrderId, contactId: sub.customerContactId,
      status: 'confirmed', invoiceDate: new Date(), dueDate,
      subtotal: sub.subtotal, taxAmount: sub.taxAmount, discountAmount: sub.discountAmount, totalAmount: sub.totalAmount,
      paymentTermLabel: sub.paymentTerm?.name ?? 'Immediate Payment',
      lines: {
        create: sub.lines.map(l => ({
          productNameSnapshot: l.productNameSnapshot, quantity: l.quantity,
          unitPrice: l.unitPrice, taxAmount: l.taxAmount, discountAmount: l.discountAmount, lineTotal: l.lineTotal,
        })),
      },
    },
    include: invInclude,
  });
}
