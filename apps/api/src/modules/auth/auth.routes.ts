import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';

import { login, signup } from './auth.service.js';

const refreshCookieName = 'refreshToken';

export const authRouter = Router();

authRouter.post('/signup', async (request, response, next) => {
  try {
    const result = await signup(request.body);
    response.cookie(refreshCookieName, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    });
    response.status(201).json({ data: { accessToken: result.accessToken, user: result.user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const result = await login(request.body);
    response.cookie(refreshCookieName, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    });
    response.json({ data: { accessToken: result.accessToken, user: result.user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_request, response) => {
  response.clearCookie(refreshCookieName);
  response.status(204).send();
});

authRouter.get('/me', requireAuth, async (request, response) => {
  response.json({ data: request.auth });
});
