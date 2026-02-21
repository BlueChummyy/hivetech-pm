import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/index.js';

export function generateAccessToken(payload: { sub: string; email: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
  });
}

export function generateRefreshToken(payload: { sub: string; email: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
  });
}

export function verifyRefreshToken(token: string): { sub: string; email: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; email: string };
}
