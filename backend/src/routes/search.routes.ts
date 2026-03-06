import { Router } from 'express';
import { z } from 'zod';
import { SearchController } from '../controllers/search.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new SearchController();

// All search routes require authentication
router.use(authenticate);

// GET /api/v1/search?q=term&workspaceId=xxx&statusCategory=ACTIVE&priority=HIGH&assigneeId=xxx&projectId=xxx
router.get(
  '/',
  validate({
    query: z.object({
      q: z.string().min(1).max(200),
      workspaceId: z.string(),
      statusCategory: z.enum(['NOT_STARTED', 'ACTIVE', 'DONE', 'CANCELLED']).optional(),
      priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      assigneeId: z.string().optional(),
      projectId: z.string().optional(),
    }),
  }),
  controller.search,
);

export { router as searchRoutes };
