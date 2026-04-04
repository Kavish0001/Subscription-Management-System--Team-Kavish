import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import { type SessionUser, loginSchema, signupSchema } from '@subscription/shared';
import { UserRole } from '@prisma/client';

import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

function issueAccessToken(user: SessionUser) {
  return jwt.sign({ email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL
  });
}

function issueRefreshToken(user: SessionUser) {
  return jwt.sign({ email: user.email, role: user.role }, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    expiresIn: env.REFRESH_TOKEN_TTL
  });
}

export async function signup(input: unknown) {
  const payload = signupSchema.parse(input);

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
      role: UserRole.portal_user,
      contacts: {
        create: {
          name: payload.name,
          isDefault: true,
          addresses: {
            create: [
              {
                type: 'billing',
                line1: 'Default Billing Address',
                city: 'Unknown',
                state: 'Unknown',
                postalCode: '000000',
                country: 'India',
                isDefault: true
              },
              {
                type: 'shipping',
                line1: 'Default Shipping Address',
                city: 'Unknown',
                state: 'Unknown',
                postalCode: '000000',
                country: 'India',
                isDefault: true
              }
            ]
          }
        }
      }
    }
  });

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return {
    accessToken: issueAccessToken(sessionUser),
    refreshToken: issueRefreshToken(sessionUser),
    user: sessionUser
  };
}

export async function login(input: unknown) {
  const payload = loginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() }
  });

  if (!user) {
    throw new AppError('Account does not exist', 404, 'ACCOUNT_NOT_FOUND');
  }

  const passwordMatches = await argon2.verify(user.passwordHash, payload.password);
  if (!passwordMatches) {
    throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return {
    accessToken: issueAccessToken(sessionUser),
    refreshToken: issueRefreshToken(sessionUser),
    user: sessionUser
  };
}
