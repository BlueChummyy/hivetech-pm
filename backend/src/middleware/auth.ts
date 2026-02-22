import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/index.js';
import { ApiError } from '../utils/api-error.js';

interface JwtPayload {
  sub: string;
  email: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing or invalid authorization header'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

