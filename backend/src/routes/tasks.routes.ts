import { Router } from 'express';
import { TasksController } from '../controllers/tasks.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new TasksController();

// All task routes require authentication
router.use(authenticate);

// POST /api/v1/tasks — Create a new task
router.post('/', controller.create);

// GET /api/v1/tasks — List tasks (with filters: projectId, statusId, assigneeId, priority)
router.get('/', controller.list);

// GET /api/v1/tasks/:id — Get task by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/tasks/:id — Update task
router.patch('/:id', controller.update);

// DELETE /api/v1/tasks/:id — Soft delete task
router.delete('/:id', controller.delete);

// POST /api/v1/tasks/:id/dependencies — Add task dependency
router.post('/:id/dependencies', controller.addDependency);

// DELETE /api/v1/tasks/:id/dependencies/:dependencyId — Remove dependency
router.delete('/:id/dependencies/:dependencyId', controller.removeDependency);

// PATCH /api/v1/tasks/:id/position — Update task position (reorder)
router.patch('/:id/position', controller.updatePosition);

export { router as tasksRoutes };
