import { Router } from 'express';
import { z } from 'zod';
import { ProjectsController } from '../controllers/projects.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new ProjectsController();

// All project routes require authentication
router.use(authenticate);

// POST /api/v1/projects — Create a new project
router.post(
  '/',
  validate({
    body: z.object({
      workspaceId: z.string(),
      name: z.string().min(1).max(100),
      key: z.string().min(1).max(10).regex(/^[A-Z][A-Z0-9]*$/),
      description: z.string().optional(),
    }),
  }),
  controller.create,
);

// GET /api/v1/projects — List projects for a workspace
router.get(
  '/',
  validate({
    query: z.object({
      workspaceId: z.string(),
    }),
  }),
  controller.list,
);

// GET /api/v1/projects/:id — Get project by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/projects/:id — Update project
router.patch(
  '/:id',
  validate({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/projects/:id — Delete project
router.delete('/:id', controller.delete);

// POST /api/v1/projects/:id/members — Add member to project
router.post(
  '/:id/members',
  validate({
    body: z.object({
      userId: z.string(),
      role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
    }),
  }),
  controller.addMember,
);

// PATCH /api/v1/projects/:id/members/:userId — Update member role
router.patch(
  '/:id/members/:userId',
  validate({
    body: z.object({
      role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
    }),
  }),
  controller.updateMember,
);

// DELETE /api/v1/projects/:id/members/:userId — Remove member
router.delete('/:id/members/:userId', controller.removeMember);

// GET /api/v1/projects/:id/statuses — List project statuses
router.get('/:id/statuses', controller.listStatuses);

// POST /api/v1/projects/:id/statuses — Create project status
router.post(
  '/:id/statuses',
  validate({
    body: z.object({
      name: z.string().min(1),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      category: z.enum(['NOT_STARTED', 'ACTIVE', 'DONE', 'CANCELLED']),
      position: z.number().optional(),
    }),
  }),
  controller.createStatus,
);

// PATCH /api/v1/projects/:id/statuses/:statusId — Update status
router.patch(
  '/:id/statuses/:statusId',
  validate({
    body: z.object({
      name: z.string().min(1).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      category: z.enum(['NOT_STARTED', 'ACTIVE', 'DONE', 'CANCELLED']).optional(),
      position: z.number().optional(),
      isDefault: z.boolean().optional(),
    }),
  }),
  controller.updateStatus,
);

// DELETE /api/v1/projects/:id/statuses/:statusId — Delete status
router.delete(
  '/:id/statuses/:statusId',
  validate({
    query: z.object({
      reassignToStatusId: z.string().optional(),
    }),
  }),
  controller.deleteStatus,
);

export { router as projectsRoutes };
