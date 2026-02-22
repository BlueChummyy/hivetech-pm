import type { Request, Response, NextFunction } from 'express';
import { SpacesService } from '../services/spaces.service.js';
import { successResponse } from '../utils/api-response.js';

const spacesService = new SpacesService();

export class SpacesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspaceId = req.params.workspaceId as string;
      const { name, description, color, icon } = req.body;
      const space = await spacesService.create({ workspaceId, name, description, color, icon }, userId);
      res.status(201).json(successResponse(space));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspaceId = req.params.workspaceId as string;
      const spaces = await spacesService.list(workspaceId, userId);
      res.status(200).json(successResponse(spaces));
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const space = await spacesService.getById(req.params.id as string, userId);
      res.status(200).json(successResponse(space));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const space = await spacesService.update(req.params.id as string, req.body, userId);
      res.status(200).json(successResponse(space));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await spacesService.delete(req.params.id as string, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
