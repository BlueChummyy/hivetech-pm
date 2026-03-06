import { Router } from 'express';
import { z } from 'zod';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new DashboardController();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/v1/dashboard/:workspaceId/stats — Get dashboard statistics
router.get('/:workspaceId/stats', controller.getStats);

// GET /api/v1/dashboard/:workspaceId/tasks?filter=active — Get filtered task list
router.get(
  '/:workspaceId/tasks',
  validate({
    query: z.object({
      filter: z.enum(['active', 'completed', 'in_progress', 'overdue', 'due_this_week', 'unassigned']),
    }),
  }),
  controller.getFilteredTasks,
);

export { router as dashboardRoutes };
