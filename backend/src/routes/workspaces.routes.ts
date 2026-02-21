import { Router } from 'express';
import { z } from 'zod';
import { WorkspacesController } from '../controllers/workspaces.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new WorkspacesController();

// All workspace routes require authentication
router.use(authenticate);

// POST /api/v1/workspaces — Create a new workspace
router.post(
  '/',
  validate({
    body: z.object({
      name: z.string().min(1).max(100),
      slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
    }),
  }),
  controller.create,
);

// GET /api/v1/workspaces — List workspaces for current user
router.get('/', controller.list);

// GET /api/v1/workspaces/:id — Get workspace by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/workspaces/:id — Update workspace
router.patch(
  '/:id',
  validate({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      logoUrl: z.string().optional(),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/workspaces/:id — Delete workspace
router.delete('/:id', controller.delete);

// POST /api/v1/workspaces/:id/members — Add member to workspace
router.post(
  '/:id/members',
  validate({
    body: z.object({
      email: z.string().email(),
      role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
    }),
  }),
  controller.addMember,
);

// PATCH /api/v1/workspaces/:id/members/:userId — Update member role
router.patch(
  '/:id/members/:userId',
  validate({
    body: z.object({
      role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
    }),
  }),
  controller.updateMember,
);

// DELETE /api/v1/workspaces/:id/members/:userId — Remove member
router.delete('/:id/members/:userId', controller.removeMember);

export { router as workspacesRoutes };
