import { createInternalUserSchema } from '@subscription/shared';
import argon2 from 'argon2';
import { Router } from 'express';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(32).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  role: z.enum(['internal_user', 'portal_user']).optional(),
  isActive: z.boolean().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one user field must be updated'
});

const addressOrderBy: Prisma.AddressOrderByWithRelationInput[] = [{ isDefault: 'desc' }, { createdAt: 'asc' }];
const activeSubscriptionStatuses: SubscriptionStatus[] = [SubscriptionStatus.active];

const userInclude = {
  defaultContact: {
    include: {
      addresses: {
        orderBy: addressOrderBy
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
    }
  }
};

function mapUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    name: user.name,
    phone: user.phone,
    address: user.address,
    defaultContactId: user.defaultContactId,
    defaultContact: user.defaultContact
      ? {
          id: user.defaultContact.id,
          name: user.defaultContact.name,
          email: user.defaultContact.email,
          phone: user.defaultContact.phone,
          address: user.defaultContact.address,
          createdAt: user.defaultContact.createdAt,
          updatedAt: user.defaultContact.updatedAt,
          addresses: user.defaultContact.addresses,
          activeSubscriptions: user.defaultContact._count?.subscriptions ?? 0
        }
      : null
  };
}

async function syncDefaultContact(client: Prisma.TransactionClient | typeof prisma, userId: string, data: {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
}) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      defaultContactId: true
    }
  });

  if (!user?.defaultContactId) {
    throw new AppError('User must have a default contact', 409, 'DEFAULT_CONTACT_MISSING');
  }

  await client.contact.update({
    where: { id: user.defaultContactId },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address
    }
  });
}

usersRouter.get('/', requireRole('admin'), async (_request, response) => {
  const users = await prisma.user.findMany({
    include: userInclude,
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: users.map(mapUser) });
});

usersRouter.get('/:id', requireRole('admin'), async (request, response, next) => {
  try {
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      include: userInclude
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    response.json({ data: mapUser(user) });
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/', requireRole('admin'), async (request, response, next) => {
  try {
    const payload = createInternalUserSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await argon2.hash(payload.password);
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email.toLowerCase(),
          passwordHash,
          role: payload.role,
          name: payload.name,
          phone: payload.phone,
          address: payload.address
        }
      });

      const contact = await tx.contact.create({
        data: {
          userId: user.id,
          createdById: (request as AuthenticatedRequest).auth?.userId,
          name: payload.name,
          email: user.email,
          phone: payload.phone,
          address: payload.address,
          isDefault: true
        }
      });

      return tx.user.update({
        where: { id: user.id },
        data: {
          defaultContactId: contact.id
        },
        include: userInclude
      });
    });

    response.status(201).json({ data: mapUser(created) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/:id', requireRole('admin'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const payload = userUpdateSchema.parse(request.body);

    const existing = await prisma.user.findUnique({
      where: { id },
      include: userInclude
    });

    if (!existing) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (existing.role === 'admin') {
      throw new AppError('Admin accounts cannot be modified from this panel', 403, 'ADMIN_LOCKED');
    }

    if (auth?.userId === existing.id && payload.isActive === false) {
      throw new AppError('You cannot disable your own account', 400, 'SELF_DISABLE_BLOCKED');
    }

    if (payload.email && payload.email.toLowerCase() !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: payload.email.toLowerCase() }
      });

      if (emailExists) {
        throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: existing.id },
        data: {
          email: payload.email?.toLowerCase(),
          role: payload.role,
          isActive: payload.isActive,
          name: payload.name,
          phone: payload.phone,
          address: payload.address
        },
        include: userInclude
      });

      await syncDefaultContact(tx as typeof prisma, user.id, {
        name: payload.name,
        email: payload.email?.toLowerCase(),
        phone: payload.phone,
        address: payload.address
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userInclude
      });
    });

    if (payload.role !== undefined || payload.isActive !== undefined || payload.email !== undefined) {
      await prisma.refreshToken.updateMany({
        where: {
          userId: existing.id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    response.json({ data: mapUser(updated) });
  } catch (error) {
    next(error);
  }
});
