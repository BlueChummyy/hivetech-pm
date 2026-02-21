import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.js';
import { errorResponse } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';

interface PrismaKnownError extends Error {
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  return (
    err instanceof Error &&
    'code' in err &&
    typeof (err as PrismaKnownError).code === 'string' &&
    (err as PrismaKnownError).code.startsWith('P')
  );
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(
      errorResponse({
        code: err.code,
        message: err.message,
        details: err.details,
      }),
    );
    return;
  }

  if (isPrismaKnownError(err)) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json(
        errorResponse({ code: 'CONFLICT', message: `Duplicate value for ${target}` }),
      );
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json(
        errorResponse({ code: 'NOT_FOUND', message: 'Resource not found' }),
      );
      return;
    }
  }

  logger.error({ err }, 'Unhandled error');

  res.status(500).json(
    errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }),
  );
}
