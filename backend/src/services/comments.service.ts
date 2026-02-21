import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { emitToProject } from '../utils/socket.js';

export class CommentsService {
  async create(data: { taskId: string; authorId: string; content: string }) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, deletedAt: null },
      select: { id: true, projectId: true },
    });
    if (!task) throw ApiError.notFound('Task not found');

    const comment = await prisma.comment.create({
      data: {
        taskId: data.taskId,
        authorId: data.authorId,
        content: data.content,
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    emitToProject(task.projectId, 'comment:created', { ...comment, taskId: data.taskId });

    return comment;
  }

  async listByTask(taskId: string, params: { page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where = { taskId, deletedAt: null };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return { comments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, content: string, userId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!comment) throw ApiError.notFound('Comment not found');
    if (comment.authorId !== userId) throw ApiError.forbidden('You can only edit your own comments');

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Get task for project room
    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
      select: { projectId: true },
    });
    if (task) {
      emitToProject(task.projectId, 'comment:updated', { ...updated, taskId: comment.taskId });
    }

    return updated;
  }

  async softDelete(id: string, userId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!comment) throw ApiError.notFound('Comment not found');
    if (comment.authorId !== userId) throw ApiError.forbidden('You can only delete your own comments');

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Get task for project room
    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
      select: { projectId: true },
    });
    if (task) {
      emitToProject(task.projectId, 'comment:deleted', { id, taskId: comment.taskId });
    }

    return { id };
  }
}
