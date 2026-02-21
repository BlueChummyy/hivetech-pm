import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new AuthController();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// POST /api/v1/auth/register — Register a new user
router.post('/register', validate({ body: registerSchema }), controller.register);

// POST /api/v1/auth/login — Login with email and password
router.post('/login', validate({ body: loginSchema }), controller.login);

// POST /api/v1/auth/refresh — Refresh access token
router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);

// POST /api/v1/auth/logout — Logout (invalidate refresh token)
router.post('/logout', authenticate, controller.logout);

// GET /api/v1/auth/me — Get current user profile
router.get('/me', authenticate, controller.me);

export { router as authRoutes };
