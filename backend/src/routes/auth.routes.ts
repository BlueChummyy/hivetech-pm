import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new AuthController();

// POST /api/v1/auth/register — Register a new user
router.post('/register', controller.register);

// POST /api/v1/auth/login — Login with email and password
router.post('/login', controller.login);

// POST /api/v1/auth/refresh — Refresh access token
router.post('/refresh', controller.refresh);

// POST /api/v1/auth/logout — Logout (invalidate refresh token)
router.post('/logout', authenticate, controller.logout);

// GET /api/v1/auth/me — Get current user profile
router.get('/me', authenticate, controller.me);

export { router as authRoutes };
