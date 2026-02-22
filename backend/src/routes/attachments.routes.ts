import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { AttachmentsController } from '../controllers/attachments.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/index.js';

const router = Router();
const controller = new AttachmentsController();

// Ensure upload directory exists
fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    // Sanitize: use only the base name to prevent path traversal via originalname
    const safeName = path.basename(file.originalname);
    const ext = path.extname(safeName);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
});

// All attachment routes require authentication
router.use(authenticate);

// POST /api/v1/attachments — Upload an attachment to a task
router.post(
  '/',
  upload.single('file'),
  validate({
    body: z.object({
      taskId: z.string(),
    }),
  }),
  controller.upload,
);

// GET /api/v1/attachments — List attachments for a task (query: taskId)
router.get(
  '/',
  validate({
    query: z.object({
      taskId: z.string(),
    }),
  }),
  controller.list,
);

// GET /api/v1/attachments/:id — Get attachment metadata
router.get('/:id', controller.getById);

// GET /api/v1/attachments/:id/download — Download attachment file
router.get('/:id/download', controller.download);

// DELETE /api/v1/attachments/:id — Delete an attachment
router.delete('/:id', controller.delete);

// --- Task-scoped attachment routes (mounted at /api/v1/tasks/:taskId/attachments) ---
const taskScopedRouter = Router({ mergeParams: true });
taskScopedRouter.use(authenticate);

// POST /api/v1/tasks/:taskId/attachments — Upload an attachment
taskScopedRouter.post(
  '/',
  upload.single('file'),
  controller.upload,
);

// GET /api/v1/tasks/:taskId/attachments — List attachments for a task
taskScopedRouter.get('/', controller.list);

// GET /api/v1/tasks/:taskId/attachments/:id — Get attachment metadata
taskScopedRouter.get('/:id', controller.getById);

// GET /api/v1/tasks/:taskId/attachments/:id/download — Download attachment file
taskScopedRouter.get('/:id/download', controller.download);

// DELETE /api/v1/tasks/:taskId/attachments/:id — Delete an attachment
taskScopedRouter.delete('/:id', controller.delete);

export { router as attachmentsRoutes, taskScopedRouter as taskAttachmentsRoutes };
