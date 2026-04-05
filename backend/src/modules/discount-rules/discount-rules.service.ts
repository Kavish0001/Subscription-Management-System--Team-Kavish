import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export const listDiscountRules = () =>
  prisma.discountRule.findMany({ include: { products: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });

export const createDiscountRule = (data: any) => {
  const { productIds, ...rest } = data;
  return prisma.discountRule.create({
    data: { ...rest, products: productIds?.length ? { create: productIds.map((id: string) => ({ productId: id })) } : undefined },
    include: { products: true },
  });
};

export const updateDiscountRule = (id: string, data: any) => prisma.discountRule.update({ where: { id }, data });
export const deleteDiscountRule = (id: string) => prisma.discountRule.delete({ where: { id } });

export async function validateDiscountCode(code: string, subtotal: number) {
  const rule = await prisma.discountRule.findUnique({ where: { code } });
  if (!rule || !rule.isActive) throw createError('Invalid discount code', 400);
  if (rule.startDate && new Date() < rule.startDate) throw createError('Discount not yet active', 400);
  if (rule.endDate && new Date() > rule.endDate) throw createError('Discount has expired', 400);
  if (rule.usageLimit && rule.usageCount >= rule.usageLimit) throw createError('Discount usage limit reached', 400);
  if (rule.minimumPurchase && subtotal < Number(rule.minimumPurchase)) throw createError(`Minimum purchase ₹${rule.minimumPurchase} required`, 400);

  const discountAmount = rule.type === 'percentage'
    ? (subtotal * Number(rule.value)) / 100
    : Number(rule.value);

  return { rule, discountAmount: Math.min(discountAmount, subtotal) };
}
