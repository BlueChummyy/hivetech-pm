import type { Request, Response, NextFunction } from 'express';
import { TaskTemplatesService } from '../services/task-templates.service.js';
import { requireProjectMember } from '../utils/authorization.js';
import { successResponse } from '../utils/api-response.js';
import { emitToProject, emitToWorkspace } from '../utils/socket.js';
import { prisma } from '../prisma/client.js';

const service = new TaskTemplatesService();

export class TaskTemplatesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, name, description, priority, subtaskTemplates } = req.body;
      await requireProjectMember(projectId, req.user!.id);

      const template = await service.create({
        projectId,
        createdById: req.user!.id,
        name,
        description,
        priority,
        subtaskTemplates,
      });

      res.status(201).json(successResponse(template));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) {
        res.status(400).json({ success: false, error: { message: 'projectId is required' } });
        return;
      }
      await requireProjectMember(projectId, req.user!.id);

      const templates = await service.list(projectId);
      res.json(successResponse(templates));
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await service.getById(req.params.id as string);
      await requireProjectMember(template.projectId, req.user!.id);
      res.json(successResponse(template));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await service.getById(req.params.id as string);
      await requireProjectMember(existing.projectId, req.user!.id);

      const { name, description, priority, subtaskTemplates } = req.body;
      const template = await service.update(req.params.id as string, {
        name,
        description,
        priority,
        subtaskTemplates,
      });

      res.json(successResponse(template));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await service.getById(req.params.id as string);
      await requireProjectMember(existing.projectId, req.user!.id);

      await service.delete(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async createTaskFromTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const templateId = req.params.templateId as string;
      const { projectId, statusId, title, description } = req.body;
      await requireProjectMember(projectId, req.user!.id);

      const task = await service.createTaskFromTemplate(templateId, {
        projectId,
        statusId,
        title,
        reporterId: req.user!.id,
        description,
      });

      emitToProject(projectId, 'task:created', task);

      // Emit to workspace for sidebar updates
      const tmplProj = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
      if (tmplProj) {
        emitToWorkspace(tmplProj.workspaceId, 'task:created', { projectId });
      }

      res.status(201).json(successResponse(task));
    } catch (err) {
      next(err);
    }
  }
}
