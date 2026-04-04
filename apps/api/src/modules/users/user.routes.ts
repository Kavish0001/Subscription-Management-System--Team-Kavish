import { Router } from 'express';
import argon2 from 'argon2';

import { createInternalUserSchema } from '@subscription/shared';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', requireRole('admin'), async (_request, response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  response.json({ data: users });
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
