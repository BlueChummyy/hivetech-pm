import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { TimerService } from '../services/timer.service.js';
import { successResponse } from '../utils/api-response.js';
import type { Request, Response, NextFunction } from 'express';

const taskRouter = Router({ mergeParams: true });
const standaloneRouter = Router();
const service = new TimerService();

taskRouter.use(authenticate);
standaloneRouter.use(authenticate);

// POST /api/v1/tasks/:taskId/timer/start — Start timer
taskRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timer = await service.start(req.params.taskId as string, req.user!.id);
    res.status(201).json(successResponse(timer));
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tasks/:taskId/timer/stop — Stop timer
taskRouter.post('/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.stop(req.params.taskId as string, req.user!.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/timer/active — Get user's active timer
standaloneRouter.get('/active', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timer = await service.getActive(req.user!.id);
    res.json(successResponse(timer));
  } catch (err) {
    next(err);
  }
});

export { taskRouter as taskTimerRoutes, standaloneRouter as timerRoutes };
