import { Router } from 'express';
import { UsersController } from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new UsersController();

// All user routes require authentication
router.use(authenticate);

// GET /api/v1/users — List users (with search/filter)
router.get('/', controller.list);

// GET /api/v1/users/:id — Get user by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/users/:id — Update user profile
router.patch('/:id', controller.update);

// DELETE /api/v1/users/:id — Soft delete user
router.delete('/:id', controller.delete);

export { router as usersRoutes };
