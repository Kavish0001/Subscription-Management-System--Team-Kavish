import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

export const contactsRouter = Router();

const contactInputSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  phone: z.string().max(32).optional(),
  companyName: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  isDefault: z.boolean().optional(),
  addresses: z
    .array(
      z.object({
        type: z.enum(['billing', 'shipping', 'other']),
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().min(1),
        isDefault: z.boolean().optional()
      })
    )
    .optional()
});

contactsRouter.use(requireAuth);

contactsRouter.get('/me', async (request, response, next) => {
  try {
    const actorId = (request as AuthenticatedRequest).auth?.userId;

    if (!actorId) {
      throw new AppError('Authentication required', 401);
    }

    const contact = await prisma.contact.findFirst({
      where: {
        userId: actorId,
        isActive: true
      },
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
        }
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    });

    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    response.json({ data: contact });
  } catch (error) {
    next(error);
  }
});

contactsRouter.get('/', requireRole('admin', 'internal_user'), async (_request, response) => {
  const contacts = await prisma.contact.findMany({
    include: { addresses: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  response.json({ data: contacts });
});

contactsRouter.post('/', async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const payload = contactInputSchema.parse(request.body);
    const userId = auth.role === 'portal_user' ? auth.userId : payload.userId;

    const contact = await prisma.contact.create({
      data: {
        userId,
        name: payload.name,
        phone: payload.phone,
        companyName: payload.companyName,
        notes: payload.notes,
        isDefault: payload.isDefault ?? false,
        addresses: payload.addresses
          ? {
              create: payload.addresses
            }
          : undefined
      },
      include: { addresses: true }
    });

    response.status(201).json({ data: contact });
  } catch (error) {
    next(error);
  }
});

contactsRouter.patch('/:id', async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const payload = contactInputSchema.partial().parse(request.body);
    const existing = await prisma.contact.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (auth.role === 'portal_user' && existing.userId !== auth.userId) {
      throw new AppError('You do not have permission to edit this contact', 403);
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name: payload.name,
        phone: payload.phone,
        companyName: payload.companyName,
        notes: payload.notes,
        isDefault: payload.isDefault
      },
      include: { addresses: true }
    });

    if (payload.addresses) {
      await prisma.address.deleteMany({
        where: { contactId: id }
      });

      await prisma.address.createMany({
        data: payload.addresses.map((address) => ({
          contactId: id,
          type: address.type,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          isDefault: address.isDefault ?? false
        }))
      });
    }

    const refreshedContact = await prisma.contact.findUnique({
      where: { id },
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
        }
      }
    });

    response.json({ data: refreshedContact ?? contact });
  } catch (error) {
    next(error);
  }
});
