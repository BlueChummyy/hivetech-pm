import { Router } from 'express';
import { z } from 'zod';
import { TaskTemplatesController } from '../controllers/task-templates.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new TaskTemplatesController();

// All template routes require authentication
router.use(authenticate);

const subtaskTemplateSchema = z.object({
  title: z.string().min(1).max(500),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
});

// POST /api/v1/task-templates — Create a new template
router.post(
  '/',
  validate({
    body: z.object({
      projectId: z.string(),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      subtaskTemplates: z.array(subtaskTemplateSchema).optional(),
    }),
  }),
  controller.create,
);

// GET /api/v1/task-templates?projectId=... — List templates for a project
router.get(
  '/',
  validate({
    query: z.object({
      projectId: z.string(),
    }),
  }),
  controller.list,
);

// GET /api/v1/task-templates/:id — Get a template by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/task-templates/:id — Update a template
router.patch(
  '/:id',
  validate({
    body: z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().nullable().optional(),
      priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      subtaskTemplates: z.array(subtaskTemplateSchema).optional(),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/task-templates/:id — Delete a template
router.delete('/:id', controller.delete);

// POST /api/v1/task-templates/:templateId/create-task — Create task from template
router.post(
  '/:templateId/create-task',
  validate({
    body: z.object({
      projectId: z.string(),
      statusId: z.string(),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
    }),
  }),
  controller.createTaskFromTemplate,
);

export { router as taskTemplatesRoutes };
