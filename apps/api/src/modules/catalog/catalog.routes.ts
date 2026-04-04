import { Prisma } from '@prisma/client';
import {
  adminProductSchema,
  discountRuleSchema,
  paginationSchema,
  productSchema,
  recurringPlanSchema,
} from '@subscription/shared';
import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

const truthyQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const productListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  sortBy: z.enum(['newest', 'name', 'price']).default('newest')
});

const adminProductListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  sortBy: z.enum(['updated', 'newest', 'name', 'price']).default('updated'),
  productType: z.enum(['goods', 'service']).optional(),
  hasRecurringPrices: truthyQuerySchema.optional(),
  hasVariants: truthyQuerySchema.optional(),
  hasMedia: truthyQuerySchema.optional(),
  isActive: truthyQuerySchema.optional(),
});

const productAdminQuery = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    category: true,
    variants: {
      include: {
        variantValues: {
          include: {
            attributeValue: {
              include: {
                attribute: true
              }
            }
          }
        }
      },
      orderBy: [{ createdAt: 'asc' }]
    },
    planPricing: {
      include: {
        recurringPlan: true
      },
      orderBy: [{ createdAt: 'asc' }]
    },
    _count: {
      select: {
        planPricing: true,
        variants: true,
        subscriptionLines: true,
        quotationTemplateLines: true
      }
    }
  }
});

const productAdminInclude = productAdminQuery.include;
type AdminProduct = Prisma.ProductGetPayload<typeof productAdminQuery>;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function inferMediaType(url: string) {
  const normalized = url.toLowerCase();
  if (normalized.startsWith('data:video/') || /\.(mp4|webm|mov|avi|m4v)(\?|$)/.test(normalized)) {
    return 'video' as const;
  }

  return 'image' as const;
}

function inferFileName(url: string, fallback: string) {
  if (url.startsWith('data:')) {
    return fallback;
  }

  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split('/').pop();
    return fileName || fallback;
  } catch {
    return fallback;
  }
}

function normalizeMedia(media: z.infer<typeof adminProductSchema>['media']) {
  const ordered = [...media]
    .map((entry, index) => ({
      ...entry,
      fileName: entry.fileName.trim(),
      sortOrder: entry.sortOrder ?? index,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const primaryIndex = ordered.findIndex((entry) => entry.isPrimary);
  const resolved = ordered.map((entry, index) => ({
    ...entry,
    isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
    sortOrder: index
  }));

  const primaryMedia = resolved.find((entry) => entry.isPrimary) ?? resolved[0];
  const primaryImage = resolved.find((entry) => entry.type === 'image') ?? primaryMedia;

  return {
    media: resolved,
    imageUrl: primaryImage?.url ?? null,
    imageUrls: resolved.map((entry) => entry.url)
  };
}

function formatAdminProduct(product: AdminProduct) {
  const media = (product.imageUrls ?? []).map((url, index) => ({
    id: `${product.id}-media-${index}`,
    type: inferMediaType(url),
    url,
    fileName: inferFileName(url, `media-${index + 1}`),
    thumbnailUrl: inferMediaType(url) === 'image' ? url : undefined,
    isPrimary: index === 0,
    sortOrder: index
  }));

  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    productType: product.productType,
    baseSalesPrice: product.baseSalesPrice,
    costPrice: product.costPrice,
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls,
    isSubscriptionEnabled: product.isSubscriptionEnabled,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: product.category,
    media,
    mediaCount: media.length,
    recurringPlansCount: product._count.planPricing,
    variantsCount: product._count.variants,
    recurringPrices: product.planPricing.map((entry) => ({
      recurringPlanId: entry.recurringPlanId,
      planName: entry.recurringPlan.name,
      price: entry.overridePrice ?? entry.recurringPlan.price,
      billingPeriod: entry.recurringPlan.intervalUnit,
      minimumQuantity: entry.recurringPlan.minimumQuantity,
      startDate: entry.recurringPlan.startDate,
      endDate: entry.recurringPlan.endDate,
      autoCloseEnabled: entry.recurringPlan.autoCloseEnabled,
      isClosable: entry.recurringPlan.isClosable,
      isPausable: entry.recurringPlan.isPausable,
      isRenewable: entry.recurringPlan.isRenewable,
      isActive: entry.recurringPlan.isActive
    })),
    variants: product.variants.map((variant, index) => {
      const linkedValue = variant.variantValues[0]?.attributeValue;
      return {
        id: variant.id,
        attribute: linkedValue?.attribute.name ?? 'Variant',
        value: linkedValue?.value ?? variant.name,
        extraPrice: linkedValue?.extraPrice ?? variant.priceOverride ?? 0,
        sortOrder: index,
        isActive: variant.isActive
      };
    })
  };
}

async function ensureAttributeValue(
  tx: Prisma.TransactionClient,
  attributeName: string,
  value: string,
  extraPrice: number
) {
  const existingAttribute = await tx.productAttribute.findFirst({
    where: {
      name: {
        equals: attributeName,
        mode: 'insensitive'
      }
    }
  });

  const attribute =
    existingAttribute ??
    (await tx.productAttribute.create({
      data: {
        name: attributeName,
        isActive: true
      }
    }));

  const existingValue = await tx.productAttributeValue.findFirst({
    where: {
      attributeId: attribute.id,
      value: {
        equals: value,
        mode: 'insensitive'
      }
    }
  });

  if (existingValue) {
    return tx.productAttributeValue.update({
      where: { id: existingValue.id },
      data: {
        value,
        extraPrice: new Prisma.Decimal(extraPrice),
        isActive: true
      }
    });
  }

  return tx.productAttributeValue.create({
    data: {
      attributeId: attribute.id,
      value,
      extraPrice: new Prisma.Decimal(extraPrice),
      isActive: true
    }
  });
}

async function saveProductGraph(
  tx: Prisma.TransactionClient,
  payload: z.infer<typeof adminProductSchema>,
  existingProductId?: string
) {
  const media = normalizeMedia(payload.media);
  const slug = payload.slug?.trim() || slugify(payload.name);
  const productId = existingProductId ?? crypto.randomUUID();
  const recurringPlanIdsToKeep: string[] = [];

  const productData = {
    name: payload.name.trim(),
    slug,
    description: payload.description?.trim() || null,
    productType: payload.productType,
    baseSalesPrice: new Prisma.Decimal(payload.baseSalesPrice),
    costPrice: new Prisma.Decimal(payload.costPrice),
    categoryId: payload.categoryId,
    isSubscriptionEnabled: payload.recurringPrices.length > 0,
    isActive: payload.isActive,
    imageUrl: media.imageUrl,
    imageUrls: media.imageUrls
  };

  if (existingProductId) {
    await tx.product.update({
      where: { id: existingProductId },
      data: productData
    });
  } else {
    await tx.product.create({
      data: {
        id: productId,
        ...productData
      }
    });
  }

  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      planPricing: true,
      variants: true
    }
  });

  await tx.productVariantValue.deleteMany({
    where: {
      variant: {
        productId: product.id
      }
    }
  });

  await tx.productVariant.deleteMany({
    where: {
      productId: product.id
    }
  });

  for (const [index, variant] of payload.variants.entries()) {
    const attributeValue = await ensureAttributeValue(
      tx,
      variant.attribute.trim(),
      variant.value.trim(),
      variant.extraPrice
    );

    await tx.productVariant.create({
      data: {
        productId: product.id,
        name: `${variant.attribute.trim()}: ${variant.value.trim()}`,
        priceOverride: new Prisma.Decimal(variant.extraPrice),
        isActive: variant.isActive,
        variantValues: {
          create: {
            attributeValueId: attributeValue.id
          }
        }
      }
    });
  }

  const existingPricingIds = new Set(product.planPricing.map((entry) => entry.recurringPlanId));

  for (const [index, recurringPrice] of payload.recurringPrices.entries()) {
    const recurringPlanId =
      recurringPrice.recurringPlanId && existingPricingIds.has(recurringPrice.recurringPlanId)
        ? recurringPrice.recurringPlanId
        : undefined;

    const recurringPlan = recurringPlanId
      ? await tx.recurringPlan.update({
          where: { id: recurringPlanId },
          data: {
            name: recurringPrice.planName.trim(),
            intervalCount: 1,
            intervalUnit: recurringPrice.billingPeriod,
            price: new Prisma.Decimal(recurringPrice.price),
            minimumQuantity: recurringPrice.minimumQuantity,
            startDate: recurringPrice.startDate,
            endDate: recurringPrice.endDate,
            autoCloseEnabled: recurringPrice.autoCloseEnabled,
            isClosable: recurringPrice.isClosable,
            isPausable: recurringPrice.isPausable,
            isRenewable: recurringPrice.isRenewable,
            isActive: recurringPrice.isActive
          }
        })
      : await tx.recurringPlan.create({
          data: {
            name: recurringPrice.planName.trim(),
            intervalCount: 1,
            intervalUnit: recurringPrice.billingPeriod,
            price: new Prisma.Decimal(recurringPrice.price),
            minimumQuantity: recurringPrice.minimumQuantity,
            startDate: recurringPrice.startDate,
            endDate: recurringPrice.endDate,
            autoCloseEnabled: recurringPrice.autoCloseEnabled,
            isClosable: recurringPrice.isClosable,
            isPausable: recurringPrice.isPausable,
            isRenewable: recurringPrice.isRenewable,
            isActive: recurringPrice.isActive
          }
        });

    recurringPlanIdsToKeep.push(recurringPlan.id);

    await tx.productPlanPricing.upsert({
      where: {
        productId_recurringPlanId: {
          productId: product.id,
          recurringPlanId: recurringPlan.id
        }
      },
      create: {
        productId: product.id,
        recurringPlanId: recurringPlan.id,
        overridePrice: new Prisma.Decimal(recurringPrice.price),
        isDefaultPlan: index === 0
      },
      update: {
        overridePrice: new Prisma.Decimal(recurringPrice.price),
        isDefaultPlan: index === 0
      }
    });
  }

  await tx.productPlanPricing.deleteMany({
    where: {
      productId: product.id,
      recurringPlanId: recurringPlanIdsToKeep.length
        ? {
            notIn: recurringPlanIdsToKeep
          }
        : undefined
    }
  });

  const saved = await tx.product.findUniqueOrThrow({
    where: { id: product.id },
    include: productAdminInclude
  });

  return formatAdminProduct(saved);
}

catalogRouter.get('/categories', async (_request, response) => {
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: 'asc' }
  });

  response.json({ data: categories });
});

catalogRouter.get('/products', async (request, response, next) => {
  try {
    const { page, pageSize, search, sortBy } = productListQuerySchema.parse(request.query);
    const normalizedSearch = search?.trim();
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(normalizedSearch
        ? {
            OR: [
              { name: { contains: normalizedSearch, mode: 'insensitive' } },
              { slug: { contains: normalizedSearch, mode: 'insensitive' } },
              { description: { contains: normalizedSearch, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const orderBy =
      sortBy === 'name'
        ? [{ name: 'asc' as const }, { createdAt: 'desc' as const }]
        : sortBy === 'price'
          ? [{ baseSalesPrice: 'asc' as const }, { createdAt: 'desc' as const }]
          : [{ createdAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, variants: true, planPricing: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.product.count({ where })
    ]);

    response.json({ data: { items, page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get('/products/:slug', async (request, response, next) => {
  try {
    const slug = String(Array.isArray(request.params.slug) ? request.params.slug[0] : request.params.slug);

    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: { category: true, variants: true, planPricing: true }
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    response.json({ data: product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get('/admin/products', requireRole('admin'), async (request, response, next) => {
  try {
    const { page, pageSize, search, sortBy, productType, hasRecurringPrices, hasVariants, hasMedia, isActive } =
      adminProductListQuerySchema.parse(request.query);

    const normalizedSearch = search?.trim();
    const where: Prisma.ProductWhereInput = {
      ...(normalizedSearch
        ? {
            OR: [
              { name: { contains: normalizedSearch, mode: 'insensitive' } },
              { productType: normalizedSearch.toLowerCase() === 'service' || normalizedSearch.toLowerCase() === 'goods' ? normalizedSearch.toLowerCase() as 'service' | 'goods' : undefined }
            ].filter(Boolean) as Prisma.ProductWhereInput[]
          }
        : {}),
      ...(productType ? { productType } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(typeof hasRecurringPrices === 'boolean'
        ? { planPricing: hasRecurringPrices ? { some: {} } : { none: {} } }
        : {}),
      ...(typeof hasVariants === 'boolean'
        ? { variants: hasVariants ? { some: {} } : { none: {} } }
        : {}),
      ...(typeof hasMedia === 'boolean'
        ? { imageUrls: { isEmpty: !hasMedia } }
        : {})
    };

    const orderBy =
      sortBy === 'name'
        ? [{ name: 'asc' as const }]
        : sortBy === 'price'
          ? [{ baseSalesPrice: 'asc' as const }, { updatedAt: 'desc' as const }]
          : sortBy === 'newest'
            ? [{ createdAt: 'desc' as const }]
            : [{ updatedAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productAdminInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.product.count({ where })
    ]);

    response.json({
      data: {
        items: items.map(formatAdminProduct),
        page,
        pageSize,
        total
      }
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get('/admin/products/:id', requireRole('admin'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: productAdminInclude
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    response.json({ data: formatAdminProduct(product) });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post('/admin/products', requireRole('admin'), async (request, response, next) => {
  try {
    const payload = adminProductSchema.parse(request.body);
    const product = await prisma.$transaction((tx) => saveProductGraph(tx, payload));
    response.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.patch('/admin/products/:id', requireRole('admin'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const payload = adminProductSchema.parse(request.body);

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const product = await prisma.$transaction((tx) => saveProductGraph(tx, payload, id));
    response.json({ data: product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.delete('/admin/products/:id', requireRole('admin'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);

    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true
      }
    });

    if (!existing) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        isSubscriptionEnabled: false
      }
    });

    response.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(new AppError('Product update conflicts with an existing record', 409, 'PRODUCT_CONFLICT'));
    }

    next(error);
  }
});

catalogRouter.post('/products', requireRole('admin'), async (request, response, next) => {
  try {
    const payload = productSchema.parse(request.body);
    const imageUrls = [
      ...new Set(
        [payload.imageUrl, ...(payload.imageUrls ?? [])].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ].slice(0, 7);

    if (imageUrls.length === 0) {
      throw new AppError('At least 1 media file is required', 400);
    }

    const product = await prisma.product.create({
      data: {
        name: payload.name.trim(),
        slug: payload.slug.trim(),
        description: payload.description?.trim(),
        productType: payload.productType,
        baseSalesPrice: new Prisma.Decimal(payload.baseSalesPrice),
        costPrice: new Prisma.Decimal(payload.costPrice),
        categoryId: payload.categoryId,
        isSubscriptionEnabled: payload.isSubscriptionEnabled,
        imageUrl: imageUrls[0],
        imageUrls,
        planPricing: payload.planPricing?.length
          ? {
              create: payload.planPricing.map((pricing, index) => ({
                recurringPlanId: pricing.recurringPlanId,
                overridePrice:
                  pricing.overridePrice !== undefined
                    ? new Prisma.Decimal(pricing.overridePrice)
                    : undefined,
                isDefaultPlan: pricing.isDefaultPlan || index === 0,
              })),
            }
          : undefined,
      }
    });

    response.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get('/recurring-plans', async (_request, response) => {
  const plans = await prisma.recurringPlan.findMany({
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: plans });
});

catalogRouter.post('/recurring-plans', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const payload = recurringPlanSchema.parse(request.body);
    const plan = await prisma.recurringPlan.create({
      data: {
        name: payload.name,
        intervalCount: payload.intervalCount,
        intervalUnit: payload.intervalUnit,
        price: new Prisma.Decimal(payload.price),
        minimumQuantity: payload.minimumQuantity,
        autoCloseEnabled: payload.autoCloseEnabled,
        autoCloseAfterCount: payload.autoCloseAfterCount,
        autoCloseAfterUnit: payload.autoCloseAfterUnit,
        isClosable: payload.isClosable,
        isPausable: payload.isPausable,
        isRenewable: payload.isRenewable
      }
    });

    response.status(201).json({ data: plan });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get('/discounts', requireRole('admin', 'internal_user'), async (_request, response) => {
  const discounts = await prisma.discountRule.findMany({
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: discounts });
});

catalogRouter.post('/discounts', requireRole('admin'), async (request, response, next) => {
  try {
    const payload = discountRuleSchema.parse(request.body);
    const actorId = (request as AuthenticatedRequest).auth?.userId;

    const discount = await prisma.discountRule.create({
      data: {
        name: payload.name,
        code: payload.code,
        discountType: payload.discountType,
        value: new Prisma.Decimal(payload.value),
        minimumPurchase:
          payload.minimumPurchase !== undefined ? new Prisma.Decimal(payload.minimumPurchase) : undefined,
        minimumQuantity: payload.minimumQuantity,
        limitUsageEnabled: payload.limitUsageEnabled,
        usageLimit: payload.usageLimit,
        scopeType: payload.scopeType,
        createdById: actorId!
      }
    });

    response.status(201).json({ data: discount });
  } catch (error) {
    next(error);
  }
});
