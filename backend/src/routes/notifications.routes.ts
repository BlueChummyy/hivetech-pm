import { Router } from 'express';
import { z } from 'zod';
import { NotificationsController } from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = new NotificationsController();

// All notification routes require authentication
router.use(authenticate);

// GET /api/v1/notifications — List notifications for current user
router.get(
  '/',
  validate({
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
  }),
  controller.list,
);

// PATCH /api/v1/notifications/read-all — Mark all notifications as read (must be before /:id)
router.patch('/read-all', controller.markAllAsRead);

// PATCH /api/v1/notifications/:id/read — Mark notification as read
router.patch('/:id/read', controller.markAsRead);

// DELETE /api/v1/notifications/:id — Delete a notification
router.delete('/:id', controller.delete);

export { router as notificationsRoutes };
