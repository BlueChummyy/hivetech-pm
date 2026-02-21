import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/index.js';

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

    return prisma.attachment.create({
      data: {
        taskId,
        uploadedById: userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
      },
    });
  }

  async list(taskId: string) {
    return prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, displayName: true } } },
    });
  }

  async getById(id: string) {
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw ApiError.notFound('Attachment not found');
    return attachment;
  }

  async delete(id: string, userId: string) {
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw ApiError.notFound('Attachment not found');

    // Delete file from filesystem
    try {
      fs.unlinkSync(attachment.storagePath);
    } catch {
      // file may not exist
    }

    return prisma.attachment.delete({ where: { id } });
  }
}
