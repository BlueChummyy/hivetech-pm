import type { Request, Response, NextFunction } from 'express';
import { CommentsService } from '../services/comments.service.js';
import { requireProjectMember } from '../utils/authorization.js';
import { successResponse, paginatedResponse } from '../utils/api-response.js';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';

const commentsService = new CommentsService();

export class CommentsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId, content } = req.body;

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      const comment = await commentsService.create({
        taskId,
        authorId: req.user!.id,
        content,
      });

      res.status(201).json(successResponse(comment));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId, page, limit } = req.query as any;

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      const result = await commentsService.listByTask(taskId, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(paginatedResponse(result.comments, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content } = req.body;
      const comment = await commentsService.update(req.params.id as string, content, req.user!.id);
      res.json(successResponse(comment));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await commentsService.softDelete(req.params.id as string, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
