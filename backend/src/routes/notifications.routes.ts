import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new NotificationsController();

// All notification routes require authentication
router.use(authenticate);

// GET /api/v1/notifications — List notifications for current user
router.get('/', controller.list);

// PATCH /api/v1/notifications/:id/read — Mark notification as read
router.patch('/:id/read', controller.markAsRead);

// PATCH /api/v1/notifications/read-all — Mark all notifications as read
router.patch('/read-all', controller.markAllAsRead);

// DELETE /api/v1/notifications/:id — Delete a notification
router.delete('/:id', controller.delete);

export { router as notificationsRoutes };
