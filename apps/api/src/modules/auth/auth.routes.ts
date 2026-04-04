import { Router, type Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { UserRole } from '@subscription/shared';

import { confirmPasswordReset, login, logout, refreshSession, requestPasswordReset, signup, verifyOtp, resendOtp } from './auth.service.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';

const accessCookieName = 'accessToken';
const refreshCookieName = 'refreshToken';

export const authRouter = Router();

function getCookieExpiry(token: string) {
  const decoded = jwt.decode(token) as JwtPayload | null;
  return decoded?.exp ? new Date(decoded.exp * 1000) : undefined;
}

function writeSessionCookies(
  response: Response,
  session: { accessToken: string; refreshToken: string },
) {
  const common = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: false,
    path: '/'
  };

  response.cookie(accessCookieName, session.accessToken, {
    ...common,
    expires: getCookieExpiry(session.accessToken)
  });
  response.cookie(refreshCookieName, session.refreshToken, {
    ...common,
    expires: getCookieExpiry(session.refreshToken)
  });
}

function clearSessionCookies(response: Response) {
  response.clearCookie(accessCookieName, { path: '/' });
  response.clearCookie(refreshCookieName, { path: '/' });
}

function clearAccessCookie(response: Response) {
  response.clearCookie(accessCookieName, { path: '/' });
}

authRouter.post('/signup', async (request, response, next) => {
  try {
    const result = await signup(request.body);
    response.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/verify-otp', async (request, response, next) => {
  try {
    const result = (await verifyOtp(request.body)) as any;
    writeSessionCookies(response, result);
    response.json({ data: { user: result.user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/resend-otp', async (request, response, next) => {
  try {
    const result = await resendOtp(request.body);
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const result = (await login(request.body)) as any;
    writeSessionCookies(response, result);
    response.json({ data: { user: result.user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (request, response, next) => {
  try {
    const refreshToken = request.cookies[refreshCookieName] as string | undefined;
    const result = (await refreshSession(refreshToken ?? '')) as any;
    writeSessionCookies(response, result);
    response.json({ data: { user: result.user } });
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === 'REFRESH_TOKEN_REQUIRED' || error.code === 'INVALID_REFRESH_TOKEN')
    ) {
      clearSessionCookies(response);
      return response.json({ data: { user: null } });
    }

    next(error);
  }
});

authRouter.post('/logout', async (request, response, next) => {
  try {
    await logout(request.cookies[refreshCookieName] as string | undefined);
    clearSessionCookies(response);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (request, response, next) => {
  try {
    const result = await requestPasswordReset(request.body);
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password/confirm', async (request, response, next) => {
  try {
    const result = await confirmPasswordReset(request.body);
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', async (request, response) => {
  const refreshToken = request.cookies[refreshCookieName] as string | undefined;
  const accessToken =
    request.headers.authorization?.replace(/^Bearer\s+/i, '') ??
    (request.cookies[accessCookieName] as string | undefined);

  if (!accessToken) {
    return response.json({
      data: {
        user: null,
        canRefresh: Boolean(refreshToken)
      }
    });
  }

  try {
    const payload = jwt.verify(accessToken, env.JWT_ACCESS_SECRET) as JwtPayload & {
      email: string;
      role: UserRole;
    };

    return response.json({
      data: {
        user: {
          userId: String(payload.sub),
          email: payload.email,
          role: payload.role
        },
        canRefresh: Boolean(refreshToken)
      }
    });
  } catch {
    clearAccessCookie(response);

    return response.json({
      data: {
        user: null,
        canRefresh: Boolean(refreshToken)
      }
    });
  }
});
