import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new ProjectsController();

// All project routes require authentication
router.use(authenticate);

// POST /api/v1/projects — Create a new project
router.post('/', controller.create);

// GET /api/v1/projects — List projects for a workspace
router.get('/', controller.list);

// GET /api/v1/projects/:id — Get project by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/projects/:id — Update project
router.patch('/:id', controller.update);

// DELETE /api/v1/projects/:id — Delete project
router.delete('/:id', controller.delete);

// POST /api/v1/projects/:id/members — Add member to project
router.post('/:id/members', controller.addMember);

// PATCH /api/v1/projects/:id/members/:userId — Update member role
router.patch('/:id/members/:userId', controller.updateMember);

// DELETE /api/v1/projects/:id/members/:userId — Remove member
router.delete('/:id/members/:userId', controller.removeMember);

// GET /api/v1/projects/:id/statuses — List project statuses
router.get('/:id/statuses', controller.listStatuses);

// POST /api/v1/projects/:id/statuses — Create project status
router.post('/:id/statuses', controller.createStatus);

// PATCH /api/v1/projects/:id/statuses/:statusId — Update status
router.patch('/:id/statuses/:statusId', controller.updateStatus);

// DELETE /api/v1/projects/:id/statuses/:statusId — Delete status
router.delete('/:id/statuses/:statusId', controller.deleteStatus);

export { router as projectsRoutes };
