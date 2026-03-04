import type { Request, Response, NextFunction } from 'express';
import { TimeEntriesService } from '../services/time-entries.service.js';
import { requireProjectMember } from '../utils/authorization.js';
import { successResponse } from '../utils/api-response.js';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';

const timeEntriesService = new TimeEntriesService();

export class TimeEntriesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.taskId as string;
      const { hours, description, date } = req.body;

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      const entry = await timeEntriesService.create({
        taskId,
        userId: req.user!.id,
        hours,
        description,
        date,
      });

      res.status(201).json(successResponse(entry));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.taskId as string;

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      const result = await timeEntriesService.listByTask(taskId);

      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hours, description, date } = req.body;
      const entry = await timeEntriesService.update(
        req.params.id as string,
        { hours, description, date },
        req.user!.id,
      );
      res.json(successResponse(entry));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entryId = req.params.id as string;
      const userId = req.user!.id;

      // Check if user is project admin for permission to delete others' entries
      const entry = await prisma.timeEntry.findUnique({
        where: { id: entryId },
        select: { taskId: true },
      });
      let isProjectAdmin = false;
      if (entry) {
        const task = await prisma.task.findFirst({
          where: { id: entry.taskId, deletedAt: null },
          select: { projectId: true },
        });
        if (task) {
          const member = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId: task.projectId, userId } },
          });
          if (member?.role === 'ADMIN') {
            isProjectAdmin = true;
          } else if (!member) {
            const project = await prisma.project.findUnique({
              where: { id: task.projectId },
              select: { workspaceId: true },
            });
            if (project) {
              const wsMember = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
              });
              if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
                isProjectAdmin = true;
              }
            }
          }
        }
      }

      await timeEntriesService.delete(entryId, userId, { isProjectAdmin });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
