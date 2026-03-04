import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new DashboardController();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/v1/dashboard/:workspaceId/stats — Get dashboard statistics
router.get('/:workspaceId/stats', controller.getStats);

export { router as dashboardRoutes };
