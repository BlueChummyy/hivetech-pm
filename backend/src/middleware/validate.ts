import type { Request, Response, NextFunction } from 'express';
import { z, type AnyZodObject, type ZodEffects } from 'zod';
import { ApiError } from '../utils/api-error.js';

type ValidatableSchema = AnyZodObject | ZodEffects<AnyZodObject>;

interface ValidationSchemas {
  body?: ValidatableSchema;
  query?: ValidatableSchema;
  params?: ValidatableSchema;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        Object.defineProperty(req, 'query', { value: parsedQuery, writable: true, configurable: true });
      }
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        Object.defineProperty(req, 'params', { value: parsedParams, writable: true, configurable: true });
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest('Validation failed', error.errors));
        return;
      }
      next(error);
    }
  };
}
