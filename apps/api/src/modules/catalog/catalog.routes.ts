import { Router } from 'express';

import {
  discountRuleSchema,
  paginationSchema,
  productSchema,
  recurringPlanSchema
} from '@subscription/shared';
import { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

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
        imageUrl: payload.imageUrl
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
    const actorId = request.auth?.userId;

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
