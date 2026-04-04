import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../lib/errors.js';

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  void _next;

  if (error instanceof ZodError) {
    return response.status(400).json({
      error: {
        message: 'Validation failed',
        issues: error.flatten()
      }
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
        details: error.details
      }
    });
  }

  console.error(error);
  return response.status(500).json({
    error: {
      message: 'Internal server error'
    }
  });
}
