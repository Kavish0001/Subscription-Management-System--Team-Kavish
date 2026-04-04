import { Prisma } from '@prisma/client';
import { taxRuleSchema } from '@subscription/shared';
import { Router } from 'express';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const taxesRouter = Router();

taxesRouter.use(requireAuth);

taxesRouter.get('/taxes', requireRole('admin', 'internal_user'), async (_request, response) => {
  const taxes = await prisma.taxRule.findMany({
    orderBy: { createdAt: 'desc' }
  });

  response.json({
    data: taxes.map((tax) => ({
      ...tax,
      amount: tax.ratePercent
    }))
  });
});

taxesRouter.post('/taxes', requireRole('admin'), async (request, response, next) => {
  try {
    const payload = taxRuleSchema.parse(request.body);

    const taxRule = await prisma.taxRule.create({
      data: {
        name: payload.name,
        taxType: payload.taxType,
        computation: payload.computation,
        ratePercent: new Prisma.Decimal(payload.amount),
        isInclusive: payload.isInclusive,
        isActive: true
      }
    });

    response.status(201).json({
      data: {
        ...taxRule,
        amount: taxRule.ratePercent
      }
    });
  } catch (error) {
    next(error);
  }
});

taxesRouter.delete('/taxes/:id', requireRole('admin'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.taxRule.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new AppError('Tax rule not found', 404, 'TAX_RULE_NOT_FOUND');
    }

    await prisma.taxRule.update({
      where: { id },
      data: {
        isActive: false
      }
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
