import { Router } from 'express';
import { z } from 'zod';
import { CommentsController } from '../controllers/comments.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireProjectPermission } from '../middleware/project-permissions.js';

const router = Router();
const controller = new CommentsController();

// All comment routes require authentication
router.use(authenticate);

// POST /api/v1/comments — Create a comment on a task
router.post(
  '/',
  validate({
    body: z.object({
      taskId: z.string(),
      content: z.string().min(1),
    }),
  }),
  requireProjectPermission('COMMENT'),
  controller.create,
);

// GET /api/v1/comments — List comments for a task (query: taskId)
router.get(
  '/',
  validate({
    query: z.object({
      taskId: z.string(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
  }),
  requireProjectPermission('VIEW_TASKS'),
  controller.list,
);

// PATCH /api/v1/comments/:id — Update a comment
router.patch(
  '/:id',
  validate({
    body: z.object({
      content: z.string().min(1),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/comments/:id — Soft delete a comment
router.delete('/:id', controller.delete);

export { router as commentsRoutes };
