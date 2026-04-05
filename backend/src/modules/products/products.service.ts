import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function listProducts(query: { page?: number; pageSize?: number; categoryId?: string; search?: string }) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 12;
  const where: any = { isActive: true };
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      include: { category: true, planPricing: { include: { recurringPlan: true } }, taxRules: { include: { taxRule: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getProductBySlug(slug: string) {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { include: { values: { include: { attributeValue: { include: { attribute: true } } } } } },
      planPricing: { include: { recurringPlan: true } },
      taxRules: { include: { taxRule: true } },
    },
  });
  if (!p) throw createError('Product not found', 404);
  return p;
}

export async function getProductById(id: string) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { include: { values: { include: { attributeValue: { include: { attribute: true } } } } } },
      planPricing: { include: { recurringPlan: true } },
      taxRules: { include: { taxRule: true } },
    },
  });
  if (!p) throw createError('Product not found', 404);
  return p;
}

export async function createProduct(data: any) {
  const slug = data.slug || toSlug(data.name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) throw createError('Slug already exists', 409);

  const { taxRuleIds, ...rest } = data;
  return prisma.product.create({
    data: {
      ...rest, slug,
      taxRules: taxRuleIds?.length ? { create: taxRuleIds.map((id: string) => ({ taxRuleId: id })) } : undefined,
    },
    include: { category: true, planPricing: true, taxRules: { include: { taxRule: true } } },
  });
}

export async function updateProduct(id: string, data: any) {
  const { taxRuleIds, ...rest } = data;
  if (taxRuleIds) {
    await prisma.productTaxRule.deleteMany({ where: { productId: id } });
    await prisma.productTaxRule.createMany({ data: taxRuleIds.map((tid: string) => ({ productId: id, taxRuleId: tid })) });
  }
  return prisma.product.update({ where: { id }, data: rest, include: { category: true, planPricing: true, taxRules: { include: { taxRule: true } } } });
}

export async function deleteProduct(id: string) {
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}

export async function addProductVariant(productId: string, attributeValueIds: string[]) {
  return prisma.productVariant.create({
    data: { productId, values: { create: attributeValueIds.map(id => ({ attributeValueId: id })) } },
    include: { values: { include: { attributeValue: { include: { attribute: true } } } } },
  });
}

export async function addProductPlanPricing(productId: string, data: { recurringPlanId: string; price: number; minimumQuantity?: number; startDate?: Date; endDate?: Date }) {
  return prisma.productPlanPricing.create({ data: { productId, ...data }, include: { recurringPlan: true } });
}
