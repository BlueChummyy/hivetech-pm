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
      const commentId = req.params.id as string;
      const userId = req.user!.id;

      // Look up the comment's task to determine the user's project role
      const comment = await prisma.comment.findFirst({
        where: { id: commentId, deletedAt: null },
        select: { taskId: true },
      });
      let isProjectAdmin = false;
      if (comment) {
        const task = await prisma.task.findFirst({
          where: { id: comment.taskId, deletedAt: null },
          select: { projectId: true },
        });
        if (task) {
          const member = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId: task.projectId, userId } },
          });
          if (member?.role === 'ADMIN') {
            isProjectAdmin = true;
          } else if (!member) {
            // Fall back to workspace role
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

      await commentsService.softDelete(commentId, userId, { isProjectAdmin });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
