import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new AuthController();

// Rate limiting for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max 20 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' } },
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// POST /api/v1/auth/register — Register a new user
router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);

// POST /api/v1/auth/login — Login with email and password
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);

// POST /api/v1/auth/refresh — Refresh access token
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), controller.refresh);

// POST /api/v1/auth/logout — Logout (invalidate refresh token)
router.post('/logout', authenticate, controller.logout);

// GET /api/v1/auth/me — Get current user profile
router.get('/me', authenticate, controller.me);

export { router as authRoutes };
