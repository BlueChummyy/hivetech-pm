import { Router } from 'express';
import { LabelsController } from '../controllers/labels.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new LabelsController();

// All label routes require authentication
router.use(authenticate);

// POST /api/v1/labels — Create a label for a project
router.post('/', controller.create);

// GET /api/v1/labels — List labels for a project (query: projectId)
router.get('/', controller.list);

// PATCH /api/v1/labels/:id — Update a label
router.patch('/:id', controller.update);

// DELETE /api/v1/labels/:id — Delete a label
router.delete('/:id', controller.delete);

// POST /api/v1/labels/:id/tasks/:taskId — Attach label to task
router.post('/:id/tasks/:taskId', controller.attachToTask);

// DELETE /api/v1/labels/:id/tasks/:taskId — Detach label from task
router.delete('/:id/tasks/:taskId', controller.detachFromTask);

export { router as labelsRoutes };
