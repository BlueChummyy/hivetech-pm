import { Router } from 'express';
import { z } from 'zod';
import { TimeEntriesController } from '../controllers/time-entries.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const taskRouter = Router({ mergeParams: true });
const standaloneRouter = Router();
const controller = new TimeEntriesController();

// All routes require authentication
taskRouter.use(authenticate);
standaloneRouter.use(authenticate);

// POST /api/v1/tasks/:taskId/time-entries — Log time on a task
taskRouter.post(
  '/',
  validate({
    body: z.object({
      hours: z.number().positive().max(24),
      description: z.string().max(500).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  controller.create,
);

// GET /api/v1/tasks/:taskId/time-entries — List time entries for a task
taskRouter.get('/', controller.list);

// PUT /api/v1/time-entries/:id — Update a time entry
standaloneRouter.put(
  '/:id',
  authenticate,
  validate({
    body: z.object({
      hours: z.number().positive().max(24).optional(),
      description: z.string().max(500).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
  }),
  controller.update,
);

// DELETE /api/v1/time-entries/:id — Delete a time entry
standaloneRouter.delete('/:id', authenticate, controller.delete);

export { taskRouter as taskTimeEntriesRoutes, standaloneRouter as timeEntriesRoutes };
