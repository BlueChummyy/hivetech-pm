import { Router } from 'express';
import { z } from 'zod';
import { TasksController } from '../controllers/tasks.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new TasksController();

// All task routes require authentication
router.use(authenticate);

// POST /api/v1/tasks — Create a new task
router.post(
  '/',
  validate({
    body: z.object({
      projectId: z.string(),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      statusId: z.string(),
      assigneeId: z.string().optional(),
      parentId: z.string().optional(),
      priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      dueDate: z.string().datetime().optional(),
      estimatedHours: z.number().positive().optional(),
    }),
  }),
  controller.create,
);

// GET /api/v1/tasks — List tasks (with filters)
router.get(
  '/',
  validate({
    query: z.object({
      projectId: z.string(),
      statusId: z.string().optional(),
      assigneeId: z.string().optional(),
      priority: z.string().optional(),
      parentId: z.string().optional(),
      search: z.string().optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
  }),
  controller.list,
);

// GET /api/v1/tasks/:id — Get task by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/tasks/:id — Update task
router.patch(
  '/:id',
  validate({
    body: z.object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().nullable().optional(),
      statusId: z.string().optional(),
      assigneeId: z.string().nullable().optional(),
      priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      position: z.number().optional(),
      dueDate: z.string().datetime().nullable().optional(),
      estimatedHours: z.number().positive().nullable().optional(),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/tasks/:id — Soft delete task
router.delete('/:id', controller.delete);

// POST /api/v1/tasks/:id/dependencies — Add task dependency
router.post(
  '/:id/dependencies',
  validate({
    body: z.object({
      dependsOnTaskId: z.string(),
      type: z.enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']).optional(),
    }),
  }),
  controller.addDependency,
);

// DELETE /api/v1/tasks/:id/dependencies/:dependencyId — Remove dependency
router.delete('/:id/dependencies/:dependencyId', controller.removeDependency);

// PATCH /api/v1/tasks/:id/position — Update task position (reorder)
router.patch(
  '/:id/position',
  validate({
    body: z.object({
      position: z.number(),
      statusId: z.string().optional(),
    }),
  }),
  controller.updatePosition,
);

export { router as tasksRoutes };
