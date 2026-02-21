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
    throw ApiError.unauthorized('Missing or invalid authorization header');
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
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    // TODO: Check user role against workspace/project membership
    // For now, pass through — role checking will be implemented
    // when workspace/project context is available
    if (roles.length > 0) {
      // Role check will be implemented with workspace context
    }

    next();
  };
}
