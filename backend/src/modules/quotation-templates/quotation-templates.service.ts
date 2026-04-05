import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export const listTemplates = () =>
  prisma.quotationTemplate.findMany({ include: { recurringPlan: true, lines: { include: { product: true } } }, orderBy: { name: 'asc' } });

export async function getTemplateById(id: string) {
  const t = await prisma.quotationTemplate.findUnique({ where: { id }, include: { recurringPlan: true, lines: { include: { product: true, variant: true }, orderBy: { sortOrder: 'asc' } } } });
  if (!t) throw createError('Template not found', 404);
  return t;
}

export const createTemplate = (data: any) => {
  const { lines, ...rest } = data;
  return prisma.quotationTemplate.create({ data: { ...rest, lines: lines ? { create: lines } : undefined }, include: { recurringPlan: true, lines: true } });
};
export const updateTemplate = (id: string, data: any) => prisma.quotationTemplate.update({ where: { id }, data, include: { lines: true } });
export const deleteTemplate = (id: string) => prisma.quotationTemplate.delete({ where: { id } });
