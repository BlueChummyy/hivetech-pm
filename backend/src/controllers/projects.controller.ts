import type { Request, Response, NextFunction } from 'express';
import { ProjectsService } from '../services/projects.service.js';
import { successResponse } from '../utils/api-response.js';

const projectsService = new ProjectsService();

export class ProjectsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { workspaceId, name, key, description } = req.body;
      const project = await projectsService.create({ workspaceId, name, key, description }, userId);
      res.status(201).json(successResponse(project));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspaceId = req.query.workspaceId as string;
      const projects = await projectsService.list(workspaceId, userId);
      res.status(200).json(successResponse(projects));
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const project = await projectsService.getById(req.params.id as string, userId);
      res.status(200).json(successResponse(project));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const project = await projectsService.update(req.params.id as string, req.body, userId);
      res.status(200).json(successResponse(project));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await projectsService.delete(req.params.id as string, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.user!.id;
      const { userId, role } = req.body;
      const member = await projectsService.addMember(req.params.id as string, { userId, role }, requesterId);
      res.status(201).json(successResponse(member));
    } catch (err) {
      next(err);
    }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.user!.id;
      const { role } = req.body;
      const member = await projectsService.updateMember(req.params.id as string, req.params.userId as string, role, requesterId);
      res.status(200).json(successResponse(member));
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.user!.id;
      await projectsService.removeMember(req.params.id as string, req.params.userId as string, requesterId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async listStatuses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statuses = await projectsService.listStatuses(req.params.id as string);
      res.status(200).json(successResponse(statuses));
    } catch (err) {
      next(err);
    }
  }

  async createStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, color, category, position } = req.body;
      const status = await projectsService.createStatus(req.params.id as string, { name, color, category, position });
      res.status(201).json(successResponse(status));
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await projectsService.updateStatus(req.params.statusId as string, req.body);
      res.status(200).json(successResponse(status));
    } catch (err) {
      next(err);
    }
  }

  async deleteStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reassignToStatusId = req.query.reassignToStatusId as string | undefined;
      await projectsService.deleteStatus(req.params.statusId as string, reassignToStatusId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
