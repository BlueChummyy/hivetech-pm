import { Router } from 'express';
import { z } from 'zod';
import { LabelsController } from '../controllers/labels.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new LabelsController();

// All label routes require authentication
router.use(authenticate);

// POST /api/v1/labels — Create a label for a project
router.post(
  '/',
  validate({
    body: z.object({
      projectId: z.string(),
      name: z.string().min(1).max(50),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
  }),
  controller.create,
);

// GET /api/v1/labels — List labels for a project (query: projectId)
router.get(
  '/',
  validate({
    query: z.object({
      projectId: z.string(),
    }),
  }),
  controller.list,
);

// PATCH /api/v1/labels/:id — Update a label
router.patch(
  '/:id',
  validate({
    body: z.object({
      name: z.string().min(1).max(50).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/labels/:id — Delete a label
router.delete('/:id', controller.delete);

// POST /api/v1/labels/:id/tasks/:taskId — Attach label to task
router.post('/:id/tasks/:taskId', controller.attachToTask);

// DELETE /api/v1/labels/:id/tasks/:taskId — Detach label from task
router.delete('/:id/tasks/:taskId', controller.detachFromTask);

export { router as labelsRoutes };
