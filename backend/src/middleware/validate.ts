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
        req.query = await schemas.query.parseAsync(req.query) as Record<string, string>;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as Record<string, string>;
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
