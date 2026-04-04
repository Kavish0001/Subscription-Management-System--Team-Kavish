import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const configurationRouter = Router();

configurationRouter.use(requireAuth);
configurationRouter.use(requireRole('admin'));

const attributeSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

const paymentTermSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  dueDays: z.number().int().min(0).max(3650).default(0)
});

const quotationTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  validityDays: z.number().int().min(1).max(3650),
  recurringPlanId: z.string().uuid().nullable().optional(),
  paymentTermLabel: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional()
});

configurationRouter.get('/attributes', async (_request, response) => {
  const attributes = await prisma.productAttribute.findMany({
    include: {
      _count: {
        select: {
          values: true
        }
      }
    },
    orderBy: [{ name: 'asc' }]
  });

  response.json({
    data: attributes.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      isActive: entry.isActive,
      valuesCount: entry._count.values,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }))
  });
});

configurationRouter.post('/attributes', async (request, response, next) => {
  try {
    const payload = attributeSchema.parse(request.body);

    const existing = await prisma.productAttribute.findFirst({
      where: {
        name: {
          equals: payload.name,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      const attribute = await prisma.productAttribute.update({
        where: { id: existing.id },
        data: {
          name: payload.name,
          isActive: true
        }
      });

      return response.status(201).json({ data: attribute });
    }

    const attribute = await prisma.productAttribute.create({
      data: {
        name: payload.name,
        isActive: true
      }
    });

    response.status(201).json({ data: attribute });
  } catch (error) {
    next(error);
  }
});

configurationRouter.delete('/attributes/:id', async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.productAttribute.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new AppError('Attribute not found', 404, 'ATTRIBUTE_NOT_FOUND');
    }

    await prisma.productAttribute.update({
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

configurationRouter.get('/quotation-templates', async (_request, response) => {
  const templates = await prisma.quotationTemplate.findMany({
    include: {
      recurringPlan: true,
      _count: {
        select: {
          lines: true,
          subscriptions: true
        }
      }
    },
    orderBy: [{ createdAt: 'desc' }]
  });

  response.json({
    data: templates.map((entry) => ({
      id: entry.id,
      name: entry.name,
      validityDays: entry.validityDays,
      paymentTermLabel: entry.paymentTermLabel,
      description: entry.description,
      isActive: entry.isActive,
      recurringPlan: entry.recurringPlan
        ? {
            id: entry.recurringPlan.id,
            name: entry.recurringPlan.name
          }
        : null,
      linesCount: entry._count.lines,
      subscriptionsCount: entry._count.subscriptions,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }))
  });
});

configurationRouter.post('/quotation-templates', async (request, response, next) => {
  try {
    const payload = quotationTemplateSchema.parse(request.body);

    const template = await prisma.quotationTemplate.create({
      data: {
        name: payload.name,
        validityDays: payload.validityDays,
        recurringPlanId: payload.recurringPlanId ?? null,
        paymentTermLabel: payload.paymentTermLabel,
        description: payload.description || null,
        isActive: true
      }
    });

    response.status(201).json({ data: template });
  } catch (error) {
    next(error);
  }
});

configurationRouter.delete('/quotation-templates/:id', async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.quotationTemplate.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new AppError('Quotation template not found', 404, 'QUOTATION_TEMPLATE_NOT_FOUND');
    }

    await prisma.quotationTemplate.update({
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

configurationRouter.get('/payment-terms', async (_request, response) => {
  const paymentTerms = await prisma.paymentTerm.findMany({
    orderBy: [{ createdAt: 'desc' }]
  });

  response.json({ data: paymentTerms });
});

configurationRouter.post('/payment-terms', async (request, response, next) => {
  try {
    const payload = paymentTermSchema.parse(request.body);

    const existing = await prisma.paymentTerm.findFirst({
      where: {
        name: {
          equals: payload.name,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      const paymentTerm = await prisma.paymentTerm.update({
        where: { id: existing.id },
        data: {
          name: payload.name,
          description: payload.description || null,
          dueDays: payload.dueDays,
          isActive: true
        }
      });

      return response.status(201).json({ data: paymentTerm });
    }

    const paymentTerm = await prisma.paymentTerm.create({
      data: {
        name: payload.name,
        description: payload.description || null,
        dueDays: payload.dueDays,
        isActive: true
      }
    });

    response.status(201).json({ data: paymentTerm });
  } catch (error) {
    next(error);
  }
});

configurationRouter.delete('/payment-terms/:id', async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.paymentTerm.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new AppError('Payment term not found', 404, 'PAYMENT_TERM_NOT_FOUND');
    }

    await prisma.paymentTerm.update({
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
