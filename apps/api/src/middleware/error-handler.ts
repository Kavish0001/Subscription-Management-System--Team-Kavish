import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../lib/errors.js';

function isPrismaKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string')
  );
}

function formatUniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.filter((value): value is string => typeof value === 'string')
    : [];

  if (target.includes('slug')) {
    return 'Slug already exists';
  }

  if (target.length === 1) {
    const [field] = target;
    return `${field[0]?.toUpperCase() ?? ''}${field.slice(1)} already exists`;
  }

  return 'Record conflicts with an existing value';
}

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

  if (isPrismaKnownRequestError(error) && error.code === 'P2002') {
    return response.status(409).json({
      error: {
        message: formatUniqueConstraintMessage(error),
        code: 'UNIQUE_CONSTRAINT'
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
