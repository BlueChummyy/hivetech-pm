import { Router } from 'express';
import { z } from 'zod';
import { SpacesController } from '../controllers/spaces.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
const controller = new SpacesController();

router.use(authenticate);

// POST /api/v1/workspaces/:workspaceId/spaces
router.post(
  '/',
  validate({
    body: z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    }),
  }),
  controller.create,
);

// GET /api/v1/workspaces/:workspaceId/spaces
router.get('/', controller.list);

// GET /api/v1/workspaces/:workspaceId/spaces/:id
router.get('/:id', controller.getById);

// PATCH /api/v1/workspaces/:workspaceId/spaces/:id
router.patch(
  '/:id',
  validate({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
      position: z.number().optional(),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/workspaces/:workspaceId/spaces/:id
router.delete('/:id', controller.delete);

export { router as spacesRoutes };
