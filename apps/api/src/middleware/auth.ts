import type { UserRole } from '@subscription/shared';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

export type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authRequest = request as AuthenticatedRequest;
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '') ?? request.cookies.accessToken;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return next(new AppError('Account is inactive or unavailable', 401));
    }

    authRequest.auth = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    return next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.auth) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(authRequest.auth.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    return next();
  };
}
