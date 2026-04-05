import { Router, Request, Response, NextFunction } from 'express';
import {
  loginSchema, signupSchema, resetPasswordSchema, resetPasswordConfirmSchema,
} from './auth.schema';
import {
  loginService, signupService, resetPasswordRequestService,
  resetPasswordConfirmService, refreshService, verifyEmailConfirmService
} from './auth.service';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginService(email, password);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) { next(err); }
});

authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = signupSchema.parse(req.body);
    const result = await signupService(name, email, password);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

authRouter.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: 'Token is required' }); return; }
    const result = await verifyEmailConfirmService(token as string);
    res.json(result);
  } catch (err) { next(err); }
});

authRouter.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = resetPasswordSchema.parse(req.body);
    await resetPasswordRequestService(email);
    res.json({ message: 'Reset link sent to your email' });
  } catch (err) { next(err); }
});

authRouter.post('/reset-password/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = resetPasswordConfirmSchema.parse(req.body);
    await resetPasswordConfirmService(token, password);
    res.json({ message: 'Password reset successfully' });
  } catch (err) { next(err); }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) { res.status(401).json({ error: 'No refresh token' }); return; }
    const tokens = await refreshService(token);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: tokens.accessToken });
  } catch (err) { next(err); }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});
