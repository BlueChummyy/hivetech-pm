import type { Request, Response, NextFunction } from 'express';
import { LabelsService } from '../services/labels.service.js';
import { successResponse } from '../utils/api-response.js';

const labelsService = new LabelsService();

export class LabelsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { projectId, name, color } = req.body;
      const label = await labelsService.create({ projectId, name, color }, userId);
      res.status(201).json(successResponse(label));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const projectId = req.query.projectId as string;
      const labels = await labelsService.listByProject(projectId, userId);
      res.status(200).json(successResponse(labels));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const label = await labelsService.update(req.params.id as string, req.body, userId);
      res.status(200).json(successResponse(label));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await labelsService.delete(req.params.id as string, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async attachToTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const taskLabel = await labelsService.attachToTask(req.params.id as string, req.params.taskId as string, userId);
      res.status(201).json(successResponse(taskLabel));
    } catch (err) {
      next(err);
    }
  }

  async detachFromTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await labelsService.detachFromTask(req.params.id as string, req.params.taskId as string, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
