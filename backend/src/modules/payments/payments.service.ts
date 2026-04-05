import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export async function mockPayment(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (!invoice) throw createError('Invoice not found', 404);
  if (invoice.status === 'paid') throw createError('Invoice already paid', 400);

  const payment = await prisma.payment.create({
    data: { invoiceId, amount: invoice.totalAmount, method: 'mock', status: 'succeeded', paidAt: new Date() },
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'paid' } });

  // Activate subscription if it was confirmed
  if (invoice.subscriptionOrderId) {
    const sub = await prisma.subscriptionOrder.findUnique({ where: { id: invoice.subscriptionOrderId } });
    if (sub?.status === 'confirmed') {
      await prisma.subscriptionOrder.update({ where: { id: sub.id }, data: { status: 'active' } });
    }
  }

  return payment;
}
