import { Prisma } from '@prisma/client';
import {
  discountRuleSchema,
  paginationSchema,
  productSchema,
  recurringPlanSchema
} from '@subscription/shared';
import { Router } from 'express';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get('/categories', async (_request, response) => {
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: 'asc' }
  });

  response.json({ data: categories });
});

catalogRouter.get('/products', async (request, response, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(request.query);
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        include: { category: true, variants: true, planPricing: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.product.count()
    ]);

    response.json({ data: { items, page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post('/products', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const payload = productSchema.parse(request.body);
    const imageUrls = [
      ...new Set(
        [payload.imageUrl, ...(payload.imageUrls ?? [])].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ].slice(0, 10);

    const product = await prisma.product.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        productType: payload.productType,
        baseSalesPrice: new Prisma.Decimal(payload.baseSalesPrice),
        costPrice: new Prisma.Decimal(payload.costPrice),
        categoryId: payload.categoryId,
        isSubscriptionEnabled: payload.isSubscriptionEnabled,
        imageUrl: imageUrls[0],
        imageUrls,
        planPricing: payload.planPricing?.length
          ? {
              create: payload.planPricing.map((pricing) => ({
                recurringPlanId: pricing.recurringPlanId,
                overridePrice:
                  pricing.overridePrice !== undefined
                    ? new Prisma.Decimal(pricing.overridePrice)
                    : undefined,
                isDefaultPlan: pricing.isDefaultPlan,
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

catalogRouter.delete('/products/:id', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);

    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            quotationTemplateLines: true,
            subscriptionLines: true,
          }
        }
      }
    });

    if (!existing) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (existing._count.quotationTemplateLines > 0 || existing._count.subscriptionLines > 0) {
      throw new AppError(
        'This product is already used in subscriptions or quotation templates and cannot be deleted.',
        409,
        'PRODUCT_IN_USE'
      );
    }

    await prisma.product.delete({
      where: { id }
    });

    response.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return next(
        new AppError(
          'This product is already used in subscriptions, invoices, or templates and cannot be deleted.',
          409,
          'PRODUCT_IN_USE'
        )
      );
    }

    if (
      error instanceof Prisma.PrismaClientUnknownRequestError &&
      String(error.message).includes('violates RESTRICT setting')
    ) {
      return next(
        new AppError(
          'This product is already used in subscriptions or quotation templates and cannot be deleted.',
          409,
          'PRODUCT_IN_USE'
        )
      );
    }

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
