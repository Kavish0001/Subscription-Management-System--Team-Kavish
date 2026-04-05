import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const configurationRouter = Router();

const recordIdSchema = z.string().uuid();

const attributeValueSchema = z.object({
  id: z.string().uuid().optional(),
  value: z.string().trim().min(1).max(120),
  extraPrice: z.number().nonnegative().default(0)
});

const attributeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  values: z.array(attributeValueSchema).max(100).default([])
});

const paymentTermSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  dueDays: z.number().int().min(0).max(3650).default(0)
});

const quotationTemplateLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().nonnegative()
});

const quotationTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  validityDays: z.number().int().min(1).max(3650),
  recurringPlanId: z.string().uuid().nullable().optional(),
  isLastForever: z.boolean().default(false),
  durationCount: z.number().int().min(1).nullable().optional(),
  durationUnit: z.enum(['week', 'month', 'year']).nullable().optional(),
  paymentTermLabel: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  lines: z.array(quotationTemplateLineSchema).max(50).default([])
}).refine((input) => input.isLastForever || (input.durationCount && input.durationUnit), {
  message: 'End-after duration is required when the template is not last forever',
  path: ['durationCount']
});

function parseId(value: unknown, label: string) {
  const parsed = recordIdSchema.safeParse(Array.isArray(value) ? value[0] : value);
  if (!parsed.success) {
    throw new AppError(`${label} is invalid`, 400, 'INVALID_ID');
  }

  return parsed.data;
}

configurationRouter.get('/attributes', requireAuth, requireRole('admin'), async (_request, response) => {
  const attributes = await prisma.productAttribute.findMany({
    include: {
      values: {
        where: {
          isActive: true
        },
        orderBy: [{ value: 'asc' }]
      },
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
      values: entry.values.map((value) => ({
        id: value.id,
        value: value.value,
        extraPrice: value.extraPrice,
        isActive: value.isActive,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt
      })),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }))
  });
});

configurationRouter.post('/attributes', requireAuth, requireRole('admin'), async (request, response, next) => {
  try {
    const payload = attributeSchema.parse(request.body);

    const existing = await prisma.productAttribute.findFirst({
      where: {
        name: {
          equals: payload.name,
          mode: 'insensitive'
        }
      },
      include: {
        values: true
      }
    });

    const attribute =
      existing
        ? await prisma.productAttribute.update({
            where: { id: existing.id },
            data: {
              name: payload.name,
              isActive: true
            }
          })
        : await prisma.productAttribute.create({
            data: {
              name: payload.name,
              isActive: true
            }
          });

    const existingValues = existing?.values ?? [];
    const keepIds: string[] = [];

    for (const value of payload.values) {
      const matchingValue =
        existingValues.find((entry) => value.id === entry.id) ??
        existingValues.find((entry) => entry.value.toLowerCase() === value.value.toLowerCase());

      const savedValue = matchingValue
        ? await prisma.productAttributeValue.update({
            where: { id: matchingValue.id },
            data: {
              value: value.value,
              extraPrice: value.extraPrice,
              isActive: true
            }
          })
        : await prisma.productAttributeValue.create({
            data: {
              attributeId: attribute.id,
              value: value.value,
              extraPrice: value.extraPrice,
              isActive: true
            }
          });

      keepIds.push(savedValue.id);
    }

    if (existingValues.length) {
      await prisma.productAttributeValue.updateMany({
        where: {
          attributeId: attribute.id,
          ...(keepIds.length
            ? {
                id: {
                  notIn: keepIds
                }
              }
            : {})
        },
        data: {
          isActive: false
        }
      });
    }

    const result = await prisma.productAttribute.findUniqueOrThrow({
      where: { id: attribute.id },
      include: {
        values: {
          where: {
            isActive: true
          },
          orderBy: [{ value: 'asc' }]
        },
        _count: {
          select: {
            values: true
          }
        }
      }
    });

    response.status(201).json({
      data: {
        id: result.id,
        name: result.name,
        description: result.description,
        isActive: result.isActive,
        valuesCount: result._count.values,
        values: result.values,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

configurationRouter.delete('/attributes/:id', requireAuth, requireRole('admin'), async (request, response, next) => {
  try {
    const id = parseId(request.params.id, 'Attribute');
    const existing = await prisma.productAttribute.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new AppError('Attribute not found', 404, 'ATTRIBUTE_NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.productAttribute.update({
        where: { id },
        data: {
          isActive: false
        }
      }),
      prisma.productAttributeValue.updateMany({
        where: {
          attributeId: id
        },
        data: {
          isActive: false
        }
      })
    ]);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

configurationRouter.get('/quotation-templates', requireAuth, requireRole('admin'), async (_request, response) => {
  const templates = await prisma.quotationTemplate.findMany({
    include: {
      recurringPlan: true,
      lines: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variant: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ sortOrder: 'asc' }]
      },
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
      isLastForever: entry.isLastForever,
      durationCount: entry.durationCount,
      durationUnit: entry.durationUnit,
      recurringPlan: entry.recurringPlan
        ? {
            id: entry.recurringPlan.id,
            name: entry.recurringPlan.name
          }
        : null,
      linesCount: entry._count.lines,
      subscriptionsCount: entry._count.subscriptions,
      lines: entry.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product.name,
        productDescription: line.product.description,
        variantId: line.variantId,
        variantName: line.variant?.name ?? null,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        sortOrder: line.sortOrder
      })),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }))
  });
});

configurationRouter.post('/quotation-templates', requireAuth, requireRole('admin'), async (request, response, next) => {
  try {
    const payload = quotationTemplateSchema.parse(request.body);

    const template = await prisma.quotationTemplate.create({
      data: {
        name: payload.name,
        validityDays: payload.validityDays,
        recurringPlanId: payload.recurringPlanId ?? null,
        isLastForever: payload.isLastForever,
        durationCount: payload.isLastForever ? null : payload.durationCount ?? null,
        durationUnit: payload.isLastForever ? null : payload.durationUnit ?? null,
        paymentTermLabel: payload.paymentTermLabel,
        description: payload.description || null,
        isActive: true,
        lines: payload.lines.length
          ? {
              create: payload.lines.map((line, index) => ({
                productId: line.productId,
                variantId: line.variantId ?? null,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                sortOrder: index
              }))
            }
          : undefined
      },
      include: {
        recurringPlan: true,
        lines: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            variant: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [{ sortOrder: 'asc' }]
        }
      }
    });

    response.status(201).json({
      data: {
        id: template.id,
        name: template.name,
        validityDays: template.validityDays,
        paymentTermLabel: template.paymentTermLabel,
        description: template.description,
        isActive: template.isActive,
        isLastForever: template.isLastForever,
        durationCount: template.durationCount,
        durationUnit: template.durationUnit,
        recurringPlan: template.recurringPlan
          ? {
              id: template.recurringPlan.id,
              name: template.recurringPlan.name
            }
          : null,
        lines: template.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          productName: line.product.name,
          productDescription: line.product.description,
          variantId: line.variantId,
          variantName: line.variant?.name ?? null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          sortOrder: line.sortOrder
        })),
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

configurationRouter.delete('/quotation-templates/:id', requireAuth, requireRole('admin'), async (request, response, next) => {
  try {
    const id = parseId(request.params.id, 'Quotation template');
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

configurationRouter.get('/payment-terms', requireAuth, requireRole('admin'), async (_request, response) => {
  const paymentTerms = await prisma.paymentTerm.findMany({
    orderBy: [{ createdAt: 'desc' }]
  });

  response.json({ data: paymentTerms });
});

configurationRouter.post('/payment-terms', requireAuth, requireRole('admin'), async (request, response, next) => {
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

    const paymentTerm =
      existing
        ? await prisma.paymentTerm.update({
            where: { id: existing.id },
            data: {
              name: payload.name,
              description: payload.description || null,
              dueDays: payload.dueDays,
              isActive: true
            }
          })
        : await prisma.paymentTerm.create({
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

configurationRouter.delete('/payment-terms/:id', requireAuth, requireRole('admin'), async (request, response, next) => {
  try {
    const id = parseId(request.params.id, 'Payment term');
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
