import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/index.js';

export function generateAccessToken(payload: { sub: string; email: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
  });
}
