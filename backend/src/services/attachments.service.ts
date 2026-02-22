import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/index.js';
import { emitToProject } from '../utils/socket.js';

export class AttachmentsService {
  async upload(taskId: string, userId: string, file: Express.Multer.File) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { project: { select: { workspaceId: true } } },
    });
    if (!task) throw ApiError.notFound('Task not found');

    // Create storage path: uploads/{workspaceId}/{projectId}/{filename}
    const storagePath = path.join(
      env.UPLOAD_DIR,
      task.project.workspaceId,
      task.projectId,
      file.filename,
    );

    // Ensure the directory exists
    const dir = path.dirname(storagePath);
    fs.mkdirSync(dir, { recursive: true });

    // Move file from temp upload location to final storage path
    if (file.path !== storagePath) {
      fs.copyFileSync(file.path, storagePath);
      fs.unlinkSync(file.path);
    }

    // Sanitize original name to prevent any stored path traversal
    const sanitizedOriginalName = path.basename(file.originalname);

    const result = await prisma.attachment.create({
      data: {
        taskId,
        uploadedById: userId,
        filename: file.filename,
        originalName: sanitizedOriginalName,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
      },
    });

    emitToProject(task.projectId, 'attachment:created', result);

    return result;
  }

  async list(taskId: string, params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where = { taskId };

    const [attachments, total] = await Promise.all([
      prisma.attachment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: true },
      }),
      prisma.attachment.count({ where }),
    ]);

    return { attachments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw ApiError.notFound('Attachment not found');

    // Validate storagePath is within the configured upload directory
    const resolvedPath = path.resolve(attachment.storagePath);
    const resolvedUploadDir = path.resolve(env.UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
      throw ApiError.badRequest('Invalid attachment storage path');
    }

    return attachment;
  }

  async delete(id: string, userId: string) {
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw ApiError.notFound('Attachment not found');

    // Only the uploader can delete attachments
    if (attachment.uploadedById !== userId) {
      throw ApiError.forbidden('You can only delete your own attachments');
    }

    // Get the task's projectId for socket emission
    const task = await prisma.task.findUnique({
      where: { id: attachment.taskId },
      select: { projectId: true },
    });

    // Delete file from filesystem
    try {
      fs.unlinkSync(attachment.storagePath);
    } catch {
      // file may not exist
    }

    const result = await prisma.attachment.delete({ where: { id } });

    if (task) {
      emitToProject(task.projectId, 'attachment:deleted', { id });
    }

    return result;
  }
}
