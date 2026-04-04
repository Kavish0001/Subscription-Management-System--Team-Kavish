import type { UserRole } from '@subscription/shared';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

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

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authRequest = request as AuthenticatedRequest;
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '') ?? request.cookies.accessToken;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    authRequest.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role
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
