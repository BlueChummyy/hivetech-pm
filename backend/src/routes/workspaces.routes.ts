import { Router } from 'express';
import { WorkspacesController } from '../controllers/workspaces.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new WorkspacesController();

// All workspace routes require authentication
router.use(authenticate);

// POST /api/v1/workspaces — Create a new workspace
router.post('/', controller.create);

// GET /api/v1/workspaces — List workspaces for current user
router.get('/', controller.list);

// GET /api/v1/workspaces/:id — Get workspace by ID
router.get('/:id', controller.getById);

// PATCH /api/v1/workspaces/:id — Update workspace
router.patch('/:id', controller.update);

// DELETE /api/v1/workspaces/:id — Delete workspace
router.delete('/:id', controller.delete);

// POST /api/v1/workspaces/:id/members — Add member to workspace
router.post('/:id/members', controller.addMember);

// PATCH /api/v1/workspaces/:id/members/:userId — Update member role
router.patch('/:id/members/:userId', controller.updateMember);

// DELETE /api/v1/workspaces/:id/members/:userId — Remove member
router.delete('/:id/members/:userId', controller.removeMember);

export { router as workspacesRoutes };
