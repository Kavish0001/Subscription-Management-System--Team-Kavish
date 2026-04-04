import { UserRole } from '@prisma/client';
import { type SessionUser, loginSchema, signupSchema } from '@subscription/shared';
import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';


import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

function validateJwtTtl(value: string): SignOptions['expiresIn'] {
  if (!/^\d+[smhd]$/i.test(value)) {
    throw new AppError('Invalid JWT TTL format', 500, 'INVALID_JWT_TTL');
  }

  return value as SignOptions['expiresIn'];
}

function issueAccessToken(user: SessionUser) {
  const options: SignOptions = {
    subject: user.id,
    expiresIn: validateJwtTtl(env.ACCESS_TOKEN_TTL)
  };

  return jwt.sign({ email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, options);
}

function issueRefreshToken(user: SessionUser) {
  const options: SignOptions = {
    subject: user.id,
    expiresIn: validateJwtTtl(env.REFRESH_TOKEN_TTL)
  };

  return jwt.sign({ email: user.email, role: user.role }, env.JWT_REFRESH_SECRET, options);
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
    throw new AppError('Account not exist', 404, 'ACCOUNT_NOT_FOUND');
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

export async function requestPasswordReset(input: unknown) {
  const email = String(input ?? '')
    .trim()
    .toLowerCase();

  if (!email) {
    throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    await prisma.auditLog.create({
      data: {
        entityType: 'user',
        entityId: user.id,
        action: 'password_reset_requested'
      }
    }).catch(() => undefined);
  }

  return {
    message: 'The password reset link has been sent to your email.'
  };
}
