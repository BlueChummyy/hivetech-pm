import { Router } from 'express';
import { CommentsController } from '../controllers/comments.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new CommentsController();

// All comment routes require authentication
router.use(authenticate);

// POST /api/v1/comments — Create a comment on a task
router.post('/', controller.create);

// GET /api/v1/comments — List comments for a task (query: taskId)
router.get('/', controller.list);

// PATCH /api/v1/comments/:id — Update a comment
router.patch('/:id', controller.update);

// DELETE /api/v1/comments/:id — Soft delete a comment
router.delete('/:id', controller.delete);

export { router as commentsRoutes };
