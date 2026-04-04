import { Router, type Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { confirmPasswordReset, login, logout, refreshSession, requestPasswordReset, signup } from './auth.service.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';

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

authRouter.post('/signup', async (request, response, next) => {
  try {
    const result = await signup(request.body);
    writeSessionCookies(response, result);
    response.status(201).json({ data: { user: result.user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const result = await login(request.body);
    writeSessionCookies(response, result);
    response.json({ data: { user: result.user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (request, response, next) => {
  try {
    const refreshToken = request.cookies[refreshCookieName] as string | undefined;
    const result = await refreshSession(refreshToken ?? '');
    writeSessionCookies(response, result);
    response.json({ data: { user: result.user } });
  } catch (error) {
    clearSessionCookies(response);
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

authRouter.get('/me', requireAuth, async (request, response) => {
  response.json({ data: (request as AuthenticatedRequest).auth });
});
