import { Router } from 'express';
import { AttachmentsController } from '../controllers/attachments.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new AttachmentsController();

// All attachment routes require authentication
router.use(authenticate);

// POST /api/v1/attachments — Upload an attachment to a task
router.post('/', controller.upload);

// GET /api/v1/attachments — List attachments for a task (query: taskId)
router.get('/', controller.list);

// GET /api/v1/attachments/:id — Get attachment metadata
router.get('/:id', controller.getById);

// GET /api/v1/attachments/:id/download — Download attachment file
router.get('/:id/download', controller.download);

// DELETE /api/v1/attachments/:id — Delete an attachment
router.delete('/:id', controller.delete);

export { router as attachmentsRoutes };
