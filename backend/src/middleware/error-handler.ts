import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.js';
import { errorResponse } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';

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

  logger.error({ err }, 'Unhandled error');

  res.status(500).json(
    errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }),
  );
}
