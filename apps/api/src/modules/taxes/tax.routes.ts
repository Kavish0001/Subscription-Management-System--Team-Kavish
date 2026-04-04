import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const taxesRouter = Router();

const taxRuleSchema = z.object({
  name: z.string().min(2).max(120),
  taxType: z.string().min(2).max(60).default('gst'),
  computation: z.enum(['percentage', 'fixed']),
  amount: z.number().nonnegative(),
  isInclusive: z.boolean().default(false)
});

taxesRouter.use(requireAuth);

taxesRouter.get('/taxes', requireRole('admin', 'internal_user'), async (_request, response) => {
  const taxes = await prisma.taxRule.findMany({
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: taxes });
});

taxesRouter.post('/taxes', requireRole('admin'), async (request, response, next) => {
  try {
    const payload = taxRuleSchema.parse(request.body);

    const taxRule = await prisma.taxRule.create({
      data: {
        name: payload.name,
        taxType: payload.taxType,
        ratePercent: new Prisma.Decimal(payload.amount),
        isInclusive: payload.isInclusive
      }
    });

    response.status(201).json({
      data: {
        ...taxRule,
        computation: payload.computation
      }
    });
  } catch (error) {
    next(error);
  }
});
