import path from 'node:path';
import fs from 'node:fs';
import type { Request, Response, NextFunction } from 'express';
import { AttachmentsService } from '../services/attachments.service.js';
import { requireProjectMember } from '../utils/authorization.js';
import { successResponse } from '../utils/api-response.js';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';

const attachmentsService = new AttachmentsService();

export class AttachmentsController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.taskId || req.body.taskId;
      if (!taskId) throw ApiError.badRequest('taskId is required');
      if (!req.file) throw ApiError.badRequest('No file uploaded');

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      const attachment = await attachmentsService.upload(taskId, req.user!.id, req.file);
      res.status(201).json(successResponse(attachment));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = (req.params.taskId || req.query.taskId) as string;
      if (!taskId) throw ApiError.badRequest('taskId is required');

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      const attachments = await attachmentsService.list(taskId);
      res.json(successResponse(attachments));
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const attachment = await attachmentsService.getById(id);

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: attachment.taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      res.json(successResponse(attachment));
    } catch (err) {
      next(err);
    }
  }

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const attachment = await attachmentsService.getById(id);

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: attachment.taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      if (req.query.inline === 'true') {
        res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
        res.sendFile(path.resolve(attachment.storagePath), (err) => {
          if (err) next(err);
        });
        return;
      } else {
        res.download(attachment.storagePath, attachment.originalName);
      }
    } catch (err) {
      next(err);
    }
  }

  async thumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const attachment = await attachmentsService.getById(id);

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: attachment.taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      const isImage = attachment.mimeType?.startsWith('image/');
      if (!isImage) {
        throw ApiError.badRequest('Thumbnails are only available for images');
      }

      const filePath = path.resolve(attachment.storagePath);
      if (!fs.existsSync(filePath)) {
        throw ApiError.notFound('File not found on disk');
      }

      // Serve the image inline — browser handles sizing via img tag
      res.setHeader('Content-Type', attachment.mimeType || 'image/jpeg');
      res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) next(err);
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const attachment = await attachmentsService.getById(id);

      // Get task to check project membership
      const task = await prisma.task.findFirst({
        where: { id: attachment.taskId, deletedAt: null },
        select: { projectId: true },
      });
      if (!task) throw ApiError.notFound('Task not found');
      await requireProjectMember(task.projectId, req.user!.id);

      await attachmentsService.delete(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
