import { Router } from 'express';
import { z } from 'zod';
import { UsersController } from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new UsersController();

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

// All user routes require authentication
router.use(authenticate);

// /me routes — must be defined before /:id to avoid conflicts
// GET /api/v1/users/me — Get current user profile
router.get('/me', controller.getMe);

// PATCH /api/v1/users/me — Update own profile
router.patch('/me', validate({ body: updateProfileSchema }), controller.updateMe);

// POST /api/v1/users/me/password — Change own password
router.post('/me/password', validate({ body: changePasswordSchema }), controller.changePassword);

// GET /api/v1/users — List users (with search/filter)
router.get('/', validate({ query: listQuerySchema }), controller.list);

// GET /api/v1/users/:id — Get user by ID
router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById);

// PATCH /api/v1/users/:id — Update user profile
router.patch('/:id', validate({ params: userIdParamsSchema, body: updateProfileSchema }), controller.update);

// DELETE /api/v1/users/:id — Soft delete user
router.delete('/:id', validate({ params: userIdParamsSchema }), controller.delete);

export { router as usersRoutes };
