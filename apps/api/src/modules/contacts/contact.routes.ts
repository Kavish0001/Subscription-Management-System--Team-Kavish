import { SubscriptionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

export const contactsRouter = Router();
const addressOrderBy: Prisma.AddressOrderByWithRelationInput[] = [{ isDefault: 'desc' }, { createdAt: 'asc' }];
const activeSubscriptionStatuses: SubscriptionStatus[] = [SubscriptionStatus.active];

const contactInputSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(32).optional(),
  address: z.string().max(500).optional(),
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

const contactInclude = {
  addresses: {
    orderBy: addressOrderBy
  },
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      defaultContactId: true
    }
  },
  _count: {
    select: {
      subscriptions: {
        where: {
          status: {
            in: activeSubscriptionStatuses
          }
        }
      }
    }
  }
};

type ContactWithRelations = Prisma.ContactGetPayload<{
  include: typeof contactInclude;
}>;

function mapContact(contact: ContactWithRelations) {
  return {
    id: contact.id,
    userId: contact.userId,
    email: contact.email,
    name: contact.name,
    phone: contact.phone,
    address: contact.address,
    companyName: contact.companyName,
    notes: contact.notes,
    isDefault: contact.isDefault,
    isActive: contact.isActive,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    addresses: contact.addresses,
    activeSubscriptions: contact._count.subscriptions,
    user: contact.user
  };
}

contactsRouter.use(requireAuth);

contactsRouter.get('/me', async (request, response, next) => {
  try {
    const actorId = (request as AuthenticatedRequest).auth?.userId;

    if (!actorId) {
      throw new AppError('Authentication required', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: actorId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        defaultContactId: true
      }
    });

    const contact = user?.defaultContactId
      ? await prisma.contact.findUnique({
          where: { id: user.defaultContactId },
          include: contactInclude
        })
      : await prisma.contact.findFirst({
          where: {
            userId: actorId,
            isActive: true
          },
          include: contactInclude,
          orderBy: addressOrderBy
        });

    const resolvedContact =
      contact ??
      (user
        ? await prisma.contact.create({
            data: {
              userId: user.id,
              name: user.name?.trim() || user.email,
              email: user.email,
              phone: user.phone,
              address: user.address,
              isDefault: true
            },
            include: contactInclude
          })
        : null);

    if (!resolvedContact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (user && !user.defaultContactId && resolvedContact.userId) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          defaultContactId: resolvedContact.id
        }
      });
    }

    response.json({ data: mapContact(resolvedContact) });
  } catch (error) {
    next(error);
  }
});

contactsRouter.get('/', requireRole('admin', 'internal_user'), async (_request, response) => {
  const contacts = await prisma.contact.findMany({
    include: contactInclude,
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  response.json({ data: contacts.map(mapContact) });
});

contactsRouter.get('/:id', requireRole('admin', 'internal_user'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: contactInclude
    });

    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    response.json({ data: mapContact(contact) });
  } catch (error) {
    next(error);
  }
});

contactsRouter.post('/', async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const payload = contactInputSchema.parse(request.body);
    const userId = auth.role === 'portal_user' ? auth.userId : payload.userId;

    if (payload.isDefault && userId) {
      await prisma.contact.updateMany({
        where: {
          userId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        createdById: auth.userId,
        name: payload.name,
        email: payload.email.toLowerCase(),
        phone: payload.phone,
        address: payload.address,
        companyName: payload.companyName,
        notes: payload.notes,
        isDefault: payload.isDefault ?? false,
        addresses: payload.addresses
          ? {
              create: payload.addresses
            }
          : undefined
      },
      include: contactInclude
    });

    if (contact.isDefault && contact.userId) {
      await prisma.user.update({
        where: { id: contact.userId },
        data: {
          defaultContactId: contact.id
        }
      });
    }

    response.status(201).json({ data: mapContact(contact) });
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
    const existing = await prisma.contact.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existing) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (auth.role === 'portal_user' && existing.userId !== auth.userId) {
      throw new AppError('You do not have permission to edit this contact', 403);
    }

    if (existing.isDefault && payload.isDefault === false) {
      throw new AppError('Default contact cannot be unset directly', 409, 'DEFAULT_CONTACT_LOCKED');
    }

    if (payload.isDefault && existing.userId) {
      await prisma.contact.updateMany({
        where: {
          userId: existing.userId,
          isDefault: true,
          id: { not: existing.id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name: payload.name,
        email: payload.email?.toLowerCase(),
        phone: payload.phone,
        address: payload.address,
        companyName: payload.companyName,
        notes: payload.notes,
        isDefault: payload.isDefault
      },
      include: contactInclude
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

    if (contact.isDefault && contact.userId) {
      await prisma.user.update({
        where: { id: contact.userId },
        data: {
          defaultContactId: contact.id,
          name: contact.name,
          email: contact.email ?? undefined,
          phone: contact.phone,
          address: contact.address
        }
      });
    }

    const refreshedContact = await prisma.contact.findUnique({
      where: { id },
      include: contactInclude
    });

    response.json({ data: mapContact(refreshedContact ?? contact) });
  } catch (error) {
    next(error);
  }
});

contactsRouter.delete('/:id', async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new AppError('Authentication required', 401);
    }

    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const existing = await prisma.contact.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isDefault: true,
        isActive: true
      }
    });

    if (!existing) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (auth.role === 'portal_user' && existing.userId !== auth.userId) {
      throw new AppError('You do not have permission to delete this contact', 403);
    }

    if (existing.isDefault) {
      throw new AppError('Default contact cannot be deleted', 409, 'DEFAULT_CONTACT_LOCKED');
    }

    if (existing.isActive) {
      await prisma.contact.update({
        where: { id },
        data: {
          isActive: false
        }
      });
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
