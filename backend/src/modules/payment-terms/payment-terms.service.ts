import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export const listPaymentTerms = () => prisma.paymentTerm.findMany({ include: { lines: true }, orderBy: { name: 'asc' } });
export async function getPaymentTermById(id: string) {
  const t = await prisma.paymentTerm.findUnique({ where: { id }, include: { lines: true } });
  if (!t) throw createError('Payment term not found', 404);
  return t;
}
export const createPaymentTerm = (data: any) => {
  const { lines, ...rest } = data;
  return prisma.paymentTerm.create({ data: { ...rest, lines: lines ? { create: lines } : undefined }, include: { lines: true } });
};
export const updatePaymentTerm = (id: string, data: any) => prisma.paymentTerm.update({ where: { id }, data, include: { lines: true } });
export const deletePaymentTerm = (id: string) => prisma.paymentTerm.delete({ where: { id } });
