import { Router } from 'express';
import { z } from 'zod';
import { TasksController } from '../controllers/tasks.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireProjectPermission, requireOwnTaskOrManager } from '../middleware/project-permissions.js';

const router = Router();
const controller = new TasksController();

// Accepts both "2026-02-21" and full ISO 8601 datetime strings, coerces to ISO string
const flexibleDateSchema = z.string().pipe(z.coerce.date()).transform((d) => d.toISOString());

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
      assigneeIds: z.array(z.string()).optional(),
      parentId: z.string().optional(),
      priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      startDate: flexibleDateSchema.optional(),
      dueDate: flexibleDateSchema.optional(),
      estimatedHours: z.number().positive().optional(),
    }),
  }),
  requireProjectPermission('CREATE_TASK'),
  controller.create,
);

// GET /api/v1/tasks/my-tasks — List all tasks assigned to the current user
router.get('/my-tasks', controller.listMyTasks);

// GET /api/v1/tasks — List tasks (with filters)
router.get(
  '/',
  validate({
    query: z.object({
      projectId: z.string().optional(),
      statusId: z.string().optional(),
      assigneeId: z.string().optional(),
      priority: z.string().optional(),
      parentId: z.string().optional(),
      search: z.string().optional(),
      includeClosed: z.string().optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
  }),
  controller.list,
);

// POST /api/v1/tasks/bulk-update — Bulk update tasks
router.post(
  '/bulk-update',
  validate({
    body: z.object({
      taskIds: z.array(z.string()).min(1),
      updates: z.object({
        statusId: z.string().optional(),
        priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
        assigneeIds: z.array(z.string()).optional(),
      }),
    }),
  }),
  controller.bulkUpdate,
);

// POST /api/v1/tasks/bulk-delete — Bulk delete tasks
router.post(
  '/bulk-delete',
  validate({
    body: z.object({
      taskIds: z.array(z.string()).min(1),
    }),
  }),
  controller.bulkDelete,
);

// GET /api/v1/tasks/:id/activity — Get activity log for a task
router.get(
  '/:id/activity',
  validate({
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
  }),
  controller.getActivity,
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
      assigneeIds: z.array(z.string()).optional(),
      priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      position: z.number().optional(),
      startDate: flexibleDateSchema.nullable().optional(),
      dueDate: flexibleDateSchema.nullable().optional(),
      estimatedHours: z.number().positive().nullable().optional(),
    }),
  }),
  requireProjectPermission('EDIT_TASK'),
  requireOwnTaskOrManager(),
  controller.update,
);

// DELETE /api/v1/tasks/:id — Soft delete task
router.delete(
  '/:id',
  requireProjectPermission('DELETE_TASK'),
  requireOwnTaskOrManager(),
  controller.delete,
);

// POST /api/v1/tasks/:id/clone — Clone a task
router.post(
  '/:id/clone',
  requireProjectPermission('CREATE_TASK'),
  controller.clone,
);

// POST /api/v1/tasks/:id/dependencies — Add task dependency
router.post(
  '/:id/dependencies',
  validate({
    body: z.object({
      dependsOnTaskId: z.string(),
      type: z.enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']).optional(),
    }),
  }),
  requireProjectPermission('EDIT_TASK'),
  requireOwnTaskOrManager(),
  controller.addDependency,
);

// DELETE /api/v1/tasks/:id/dependencies/:dependencyId — Remove dependency
router.delete(
  '/:id/dependencies/:dependencyId',
  requireProjectPermission('EDIT_TASK'),
  requireOwnTaskOrManager(),
  controller.removeDependency,
);

// POST /api/v1/tasks/:id/move — Move task to another project
router.post(
  '/:id/move',
  validate({
    body: z.object({
      targetProjectId: z.string(),
    }),
  }),
  controller.moveToProject,
);

// PATCH /api/v1/tasks/:id/position — Update task position (reorder)
router.patch(
  '/:id/position',
  validate({
    body: z.object({
      position: z.number(),
      statusId: z.string().optional(),
    }),
  }),
  requireProjectPermission('CHANGE_TASK_STATUS'),
  requireOwnTaskOrManager(),
  controller.updatePosition,
);

// PUT /api/v1/tasks/:id/recurrence — Set/update/remove recurrence
router.put(
  '/:id/recurrence',
  validate({
    body: z.object({
      recurrenceRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']).nullable(),
      recurrenceInterval: z.number().int().min(1).optional(),
      recurrenceDays: z.array(z.enum(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])).optional(),
      recurrenceEndDate: flexibleDateSchema.nullable().optional(),
    }),
  }),
  requireProjectPermission('EDIT_TASK'),
  requireOwnTaskOrManager(),
  controller.updateRecurrence,
);

// PATCH /api/v1/tasks/:id/close — Close/archive a task
router.patch(
  '/:id/close',
  requireProjectPermission('EDIT_TASK'),
  controller.close,
);

// PATCH /api/v1/tasks/:id/reopen — Reopen a closed task
router.patch(
  '/:id/reopen',
  requireProjectPermission('EDIT_TASK'),
  controller.reopen,
);

export { router as tasksRoutes };
