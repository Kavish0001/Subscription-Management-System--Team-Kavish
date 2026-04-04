import { UserRole } from '@prisma/client';
import {
  confirmPasswordResetSchema,
  requestPasswordResetSchema,
  type SessionUser,
  loginSchema,
  signupSchema
} from '@subscription/shared';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

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

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function getTokenExpiry(token: string) {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded?.exp) {
    throw new AppError('Unable to determine token expiry', 500, 'TOKEN_EXPIRY_MISSING');
  }

  return new Date(decoded.exp * 1000);
}

async function revokeAllRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

async function persistRefreshToken(userId: string, refreshToken: string) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getTokenExpiry(refreshToken)
    }
  });
}

async function createSessionTokens(user: SessionUser) {
  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user);

  await revokeAllRefreshTokens(user.id);
  await persistRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user
  };
}

async function createPortalUser(input: { email: string; password: string; name: string }) {
  const passwordHash = await argon2.hash(input.password);

  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: UserRole.portal_user,
      contacts: {
        create: {
          name: input.name,
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
}

export async function signup(input: unknown) {
  const payload = signupSchema.parse(input);

  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() }
  });

  if (existingUser) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  const user = await createPortalUser(payload);
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return createSessionTokens(sessionUser);
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

  return createSessionTokens(sessionUser);
}

export async function refreshSession(refreshToken: string) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload & {
    email: string;
    role: SessionUser['role'];
  };
  const userId = String(payload.sub);
  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      userId,
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!storedToken || !storedToken.user.isActive) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() }
  });

  const sessionUser: SessionUser = {
    id: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role
  };

  return createSessionTokens(sessionUser);
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(refreshToken),
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export async function requestPasswordReset(input: unknown) {
  const payload = requestPasswordResetSchema.parse(input);
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError('Account not exist', 404, 'ACCOUNT_NOT_FOUND');
  }

  const rawToken = randomBytes(32).toString('hex');
  const resetLink = `${env.APP_URL}/reset-password?token=${rawToken}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordTokenHash: hashToken(rawToken),
      resetPasswordExpiresAt: expiresAt
    }
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'user',
      entityId: user.id,
      action: 'password_reset_requested',
      newValuesJson: {
        expiresAt: expiresAt.toISOString()
      }
    }
  }).catch(() => undefined);

  return {
    message: 'The password reset link has been sent to your email.',
    resetLink
  };
}

export async function confirmPasswordReset(input: unknown) {
  const payload = confirmPasswordResetSchema.parse(input);
  const tokenHash = hashToken(payload.token);

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new AppError('Reset link is invalid or expired', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await argon2.hash(payload.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null
      }
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    }),
    prisma.auditLog.create({
      data: {
        entityType: 'user',
        entityId: user.id,
        action: 'password_reset_completed'
      }
    })
  ]);

  return {
    message: 'Password updated successfully.'
  };
}
