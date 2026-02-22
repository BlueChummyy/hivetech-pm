import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { emitToProject, emitToUser } from '../utils/socket.js';

export class CommentsService {
  async create(data: { taskId: string; authorId: string; content: string }) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, deletedAt: null },
      select: { id: true, projectId: true, title: true, assigneeId: true, reporterId: true },
    });
    if (!task) throw ApiError.notFound('Task not found');

    const comment = await prisma.comment.create({
      data: {
        taskId: data.taskId,
        authorId: data.authorId,
        content: data.content,
      },
      include: {
        author: true,
      },
    });

    emitToProject(task.projectId, 'comment:created', { ...comment, taskId: data.taskId });

    // Notify task assignee about new comment (if commenter is different)
    if (task.assigneeId && task.assigneeId !== data.authorId) {
      const notification = await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: 'COMMENT_ADDED',
          title: 'New comment',
          message: `New comment on "${task.title}"`,
          resourceType: 'task',
          resourceId: task.id,
        },
      });
      emitToUser(task.assigneeId, 'notification:new', notification);
    }

    // Notify task reporter about new comment (if different from commenter and assignee)
    if (task.reporterId && task.reporterId !== data.authorId && task.reporterId !== task.assigneeId) {
      const notification = await prisma.notification.create({
        data: {
          userId: task.reporterId,
          type: 'COMMENT_ADDED',
          title: 'New comment',
          message: `New comment on "${task.title}"`,
          resourceType: 'task',
          resourceId: task.id,
        },
      });
      emitToUser(task.reporterId, 'notification:new', notification);
    }

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
          author: true,
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
        author: true,
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
