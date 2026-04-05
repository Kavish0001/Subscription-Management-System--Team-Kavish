import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten().fieldErrors });
    return;
  }
  if (err instanceof Error) {
    const status = (err as any).status ?? 500;
    res.status(status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}

export function createError(message: string, status: number): Error {
  const err = new Error(message) as any;
  err.status = status;
  return err;
}
