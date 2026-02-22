import type { Request, Response, NextFunction } from 'express';
import { TasksService } from '../services/tasks.service.js';
import { requireProjectMember } from '../utils/authorization.js';
import { ApiError } from '../utils/api-error.js';
import { successResponse, paginatedResponse } from '../utils/api-response.js';
import { prisma } from '../prisma/client.js';

const tasksService = new TasksService();

export class TasksController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, title, description, statusId, assigneeId, parentId, priority, dueDate, estimatedHours } = req.body;
      await requireProjectMember(projectId, req.user!.id);

      const task = await tasksService.create({
        projectId,
        title,
        description,
        statusId,
        assigneeId,
        reporterId: req.user!.id,
        parentId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours,
      });

      res.status(201).json(successResponse(task));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, statusId, assigneeId, priority, parentId, search, page, limit } = req.query as any;
      if (projectId) {
        await requireProjectMember(projectId, req.user!.id);
      } else if (!assigneeId || assigneeId !== req.user!.id) {
        // Without a projectId, only allow users to list their own assigned tasks
        // to prevent unauthorized access to tasks across all projects
        throw ApiError.badRequest('projectId is required, or assigneeId must be your own user ID');
      }

      const result = await tasksService.list({
        projectId,
        statusId,
        assigneeId,
        priority,
        parentId: parentId === 'null' ? null : parentId,
        search,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(paginatedResponse(result.tasks, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await tasksService.getById(req.params.id as string);
      await requireProjectMember(task.project.id, req.user!.id);
      res.json(successResponse(task));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const existing = await tasksService.getById(id);
      await requireProjectMember(existing.project.id, req.user!.id);

      const { title, description, statusId, assigneeId, priority, position, dueDate, estimatedHours } = req.body;

      // If changing status to a DONE category, require PROJECT_MANAGER+ role
      if (statusId) {
        const targetStatus = await prisma.status.findUnique({ where: { id: statusId } });
        if (targetStatus?.category === 'DONE') {
          const userRole = (req as any).projectRole as string;
          const roleLevel: Record<string, number> = { ADMIN: 5, PROJECT_MANAGER: 4, TEAM_MEMBER: 3, VIEWER: 2, GUEST: 1 };
          if ((roleLevel[userRole] ?? 0) < roleLevel['PROJECT_MANAGER']) {
            throw ApiError.forbidden('Only Project Managers and above can mark tasks as completed');
          }
        }
      }

      const task = await tasksService.update(id, {
        title,
        description,
        statusId,
        assigneeId,
        priority,
        position,
        dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
        estimatedHours: estimatedHours === null ? null : estimatedHours,
      }, req.user!.id);

      res.json(successResponse(task));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const existing = await tasksService.getById(id);
      await requireProjectMember(existing.project.id, req.user!.id);

      await tasksService.softDelete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async addDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const existing = await tasksService.getById(id);
      await requireProjectMember(existing.project.id, req.user!.id);

      const { dependsOnTaskId, type } = req.body;
      const dependency = await tasksService.addDependency(id, dependsOnTaskId, type);
      res.status(201).json(successResponse(dependency));
    } catch (err) {
      next(err);
    }
  }

  async removeDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const existing = await tasksService.getById(id);
      await requireProjectMember(existing.project.id, req.user!.id);

      await tasksService.removeDependency(req.params.dependencyId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async updatePosition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const existing = await tasksService.getById(id);
      await requireProjectMember(existing.project.id, req.user!.id);

      const { position, statusId } = req.body;
      const task = await tasksService.updatePosition(id, position, statusId);
      res.json(successResponse(task));
    } catch (err) {
      next(err);
    }
  }
}
