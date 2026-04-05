import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

const subInclude = {
  customerContact: { include: { addresses: true } },
  recurringPlan: true,
  quotationTemplate: true,
  paymentTerm: true,
  lines: { include: { product: true, taxes: { include: { taxRule: true } } } },
  invoices: true,
};

async function nextSubNumber() {
  const count = await prisma.subscriptionOrder.count();
  return `SUB-${String(count + 1).padStart(4, '0')}`;
}

export async function listSubscriptions() {
  return prisma.subscriptionOrder.findMany({ include: { customerContact: true, recurringPlan: true }, orderBy: { createdAt: 'desc' } });
}

export async function getMySubscriptions(userId: string) {
  const contacts = await prisma.contact.findMany({ where: { userId }, select: { id: true } });
  const contactIds = contacts.map(c => c.id);
  return prisma.subscriptionOrder.findMany({
    where: { customerContactId: { in: contactIds } },
    include: { recurringPlan: true, lines: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSubscriptionById(id: string) {
  const s = await prisma.subscriptionOrder.findFirst({ where: { OR: [{ id }, { subscriptionNumber: id }] }, include: subInclude });
  if (!s) throw createError('Subscription not found', 404);
  return s;
}

export async function createSubscription(data: any) {
  const { lines, discountCode, ...rest } = data;
  const subscriptionNumber = await nextSubNumber();

  let discountAmount = 0;
  if (discountCode) {
    const rule = await prisma.discountRule.findUnique({ where: { code: discountCode } });
    if (rule?.isActive) {
      const subtotal = lines.reduce((sum: number, l: any) => sum + l.quantity * l.unitPrice, 0);
      discountAmount = rule.type === 'percentage' ? (subtotal * Number(rule.value)) / 100 : Number(rule.value);
    }
  }

  const processedLines = await Promise.all(lines.map(async (line: any) => {
    const product = await prisma.product.findUnique({ where: { id: line.productId }, include: { taxRules: { include: { taxRule: true } } } });
    const taxAmount = product?.taxRules.reduce((sum, tr) => sum + (line.unitPrice * line.quantity * Number(tr.taxRule.ratePercent)) / 100, 0) ?? 0;
    const lineTotal = line.quantity * line.unitPrice - (line.discountAmount ?? 0) + taxAmount;
    return { ...line, productNameSnapshot: product?.name ?? line.productNameSnapshot, taxAmount, lineTotal };
  }));

  const subtotal = processedLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = processedLines.reduce((s, l) => s + l.taxAmount, 0);
  const totalAmount = subtotal - discountAmount + taxAmount;

  return prisma.subscriptionOrder.create({
    data: {
      ...rest, subscriptionNumber, subtotal, taxAmount, discountAmount, totalAmount,
      lines: { create: processedLines.map(({ taxes, ...l }) => l) },
    },
    include: subInclude,
  });
}

export async function updateSubscription(id: string, data: any) {
  const { lines, ...rest } = data;
  return prisma.subscriptionOrder.update({ where: { id }, data: rest, include: subInclude });
}

export async function deleteSubscription(id: string) {
  const sub = await prisma.subscriptionOrder.findUnique({ where: { id } });
  if (!sub) throw createError('Not found', 404);
  if (sub.status !== 'draft') throw createError('Only draft subscriptions can be deleted', 400);
  return prisma.subscriptionOrder.delete({ where: { id } });
}

export async function sendQuotation(id: string) {
  return prisma.subscriptionOrder.update({ where: { id }, data: { status: 'quotation_sent' }, include: subInclude });
}

export async function confirmSubscription(id: string) {
  return prisma.subscriptionOrder.update({ where: { id }, data: { status: 'confirmed', startDate: new Date() }, include: subInclude });
}

export async function renewSubscription(id: string) {
  const sub = await getSubscriptionById(id);
  const recurringPlan = sub.recurringPlan;
  if (!recurringPlan?.isRenewable) throw createError('This subscription cannot be renewed', 400);

  const subscriptionNumber = await nextSubNumber();
  const { id: _id, createdAt, updatedAt, subscriptionNumber: _num, invoices, ...rest } = sub as any;
  return prisma.subscriptionOrder.create({
    data: { ...rest, subscriptionNumber, status: 'draft', customerContactId: sub.customerContactId, lines: { create: sub.lines.map(({ id: _lid, subscriptionOrderId: _sid, taxes, ...l }) => l as any) } },
    include: subInclude,
  });
}

export async function closeSubscription(id: string) {
  const sub = await getSubscriptionById(id);
  if (!sub.recurringPlan?.isClosable) throw createError('This subscription cannot be closed', 400);
  return prisma.subscriptionOrder.update({ where: { id }, data: { status: 'closed' }, include: subInclude });
}
