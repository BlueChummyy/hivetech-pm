import type { Request, Response, NextFunction } from 'express';
import { WorkspacesService } from '../services/workspaces.service.js';
import { successResponse } from '../utils/api-response.js';

const workspacesService = new WorkspacesService();

export class WorkspacesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, slug, description } = req.body;
      const workspace = await workspacesService.create({ name, slug, description }, userId);
      res.status(201).json(successResponse(workspace));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspaces = await workspacesService.listForUser(userId);
      res.status(200).json(successResponse(workspaces));
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspace = await workspacesService.getById(req.params.id as string, userId);
      res.status(200).json(successResponse(workspace));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspace = await workspacesService.update(req.params.id as string, req.body, userId);
      res.status(200).json(successResponse(workspace));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await workspacesService.delete(req.params.id as string, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { email, role } = req.body;
      const member = await workspacesService.addMember(req.params.id as string, { email, role }, userId);
      res.status(201).json(successResponse(member));
    } catch (err) {
      next(err);
    }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { role } = req.body;
      const member = await workspacesService.updateMember(req.params.id as string, req.params.userId as string, role, userId);
      res.status(200).json(successResponse(member));
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await workspacesService.removeMember(req.params.id as string, req.params.userId as string, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
