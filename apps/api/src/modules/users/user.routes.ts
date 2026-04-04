import { createInternalUserSchema } from '@subscription/shared';
import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';


import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', requireRole('admin'), async (_request, response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      contacts: {
        where: {
          isDefault: true
        },
        select: {
          name: true
        },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  response.json({
    data: users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      name: user.contacts[0]?.name ?? null
    }))
  });
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
    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        passwordHash,
        role: payload.role,
        contacts: {
          create: {
            name: payload.name,
            isDefault: true
          }
        }
      }
    });

    response.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

const updateUserSchema = z
  .object({
    role: z.enum(['internal_user', 'portal_user']).optional(),
    isActive: z.boolean().optional()
  })
  .refine((input) => input.role !== undefined || input.isActive !== undefined, {
    message: 'At least one user field must be updated'
  });

usersRouter.patch('/:id', requireRole('admin'), async (request, response, next) => {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    const id = String(Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
    const payload = updateUserSchema.parse(request.body);

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        contacts: {
          where: {
            isDefault: true
          },
          select: {
            name: true
          },
          take: 1
        }
      }
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

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: payload.role,
        isActive: payload.isActive
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        contacts: {
          where: {
            isDefault: true
          },
          select: {
            name: true
          },
          take: 1
        }
      }
    });

    if (payload.role !== undefined || payload.isActive !== undefined) {
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

    response.json({
      data: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        lastLoginAt: updated.lastLoginAt,
        name: updated.contacts[0]?.name ?? null
      }
    });
  } catch (error) {
    next(error);
  }
});
