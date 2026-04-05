import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export const listCategories = () => prisma.productCategory.findMany({ orderBy: { name: 'asc' } });
export const createCategory = (name: string) => prisma.productCategory.create({ data: { name } });

export const listAttributes = () =>
  prisma.productAttribute.findMany({ include: { values: true }, orderBy: { name: 'asc' } });

export async function getAttributeById(id: string) {
  const a = await prisma.productAttribute.findUnique({ where: { id }, include: { values: true } });
  if (!a) throw createError('Attribute not found', 404);
  return a;
}

export const createAttribute = (data: { name: string; description?: string }) =>
  prisma.productAttribute.create({ data, include: { values: true } });

export const updateAttribute = (id: string, data: { name?: string; description?: string }) =>
  prisma.productAttribute.update({ where: { id }, data, include: { values: true } });

export const deleteAttribute = (id: string) => prisma.productAttribute.delete({ where: { id } });

export const addAttributeValue = (attributeId: string, data: { value: string; extraPrice?: number }) =>
  prisma.productAttributeValue.create({ data: { attributeId, value: data.value, extraPrice: data.extraPrice ?? 0 } });

export const updateAttributeValue = (id: string, data: { value?: string; extraPrice?: number }) =>
  prisma.productAttributeValue.update({ where: { id }, data });
