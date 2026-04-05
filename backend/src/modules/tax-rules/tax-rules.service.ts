import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export const listTaxRules = () => prisma.taxRule.findMany({ orderBy: { name: 'asc' } });
export async function getTaxRuleById(id: string) {
  const t = await prisma.taxRule.findUnique({ where: { id } });
  if (!t) throw createError('Tax rule not found', 404);
  return t;
}
export const createTaxRule = (data: any) => prisma.taxRule.create({ data });
export const updateTaxRule = (id: string, data: any) => prisma.taxRule.update({ where: { id }, data });
export const deleteTaxRule = (id: string) => prisma.taxRule.delete({ where: { id } });
