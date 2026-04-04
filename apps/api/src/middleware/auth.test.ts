import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

function createNext() {
  return vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
}

describe('auth middleware', () => {
  it('attaches auth context for valid bearer tokens', () => {
    const token = jwt.sign(
      { email: 'admin@veltrix.com', role: 'admin' },
      env.JWT_ACCESS_SECRET,
      { subject: 'user-1', expiresIn: '15m' }
    );
    const request = {
      headers: {
        authorization: `Bearer ${token}`
      },
      cookies: {}
    } as unknown as AuthenticatedRequest;
    const next = createNext();

    requireAuth(request as Request, {} as Response, next);

    expect(request.auth).toEqual({
      userId: 'user-1',
      email: 'admin@veltrix.com',
      role: 'admin'
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects missing authentication tokens', () => {
    const next = createNext();

    requireAuth({ headers: {}, cookies: {} } as unknown as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const [error] = next.mock.calls[0] as [AppError];
    expect(error.statusCode).toBe(401);
  });

  it('blocks roles outside the allowed list', () => {
    const next = createNext();
    const middleware = requireRole('admin');

    middleware(
      {
        auth: {
          userId: 'user-2',
          email: 'portal@veltrix.com',
          role: 'portal_user'
        }
      } as unknown as Request,
      {} as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const [error] = next.mock.calls[0] as [AppError];
    expect(error.statusCode).toBe(403);
  });
});
