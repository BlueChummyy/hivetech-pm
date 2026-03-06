import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ChecklistService } from '../services/checklist.service.js';
import { successResponse } from '../utils/api-response.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router({ mergeParams: true });
const service = new ChecklistService();

router.use(authenticate);

// GET /api/v1/tasks/:taskId/checklist — List checklist items
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await service.list(req.params.taskId as string);
    res.json(successResponse(items));
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tasks/:taskId/checklist — Create checklist item
router.post(
  '/',
  validate({
    body: z.object({
      title: z.string().min(1).max(500),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await service.create({
        taskId: req.params.taskId as string,
        title: req.body.title,
      }, req.user?.id);
      res.status(201).json(successResponse(item));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/tasks/:taskId/checklist/reorder — Reorder items (must be before /:itemId)
router.patch(
  '/reorder',
  validate({
    body: z.object({
      items: z.array(z.object({
        id: z.string(),
        position: z.number(),
      })),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await service.reorder(req.params.taskId as string, req.body.items);
      res.json(successResponse(items));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/tasks/:taskId/checklist/:itemId — Update checklist item
router.patch(
  '/:itemId',
  validate({
    body: z.object({
      title: z.string().min(1).max(500).optional(),
      isChecked: z.boolean().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await service.update(req.params.itemId as string, req.body, req.user?.id);
      res.json(successResponse(item));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/tasks/:taskId/checklist/:itemId — Delete checklist item
router.delete('/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.delete(req.params.itemId as string, req.user?.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as checklistRoutes };
