import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { emitToProject, emitToUser } from '../utils/socket.js';
import { logAudit } from './audit.service.js';

// Parse @[User Name](userId) patterns from comment text
function parseMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const userIds: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    userIds.push(match[2]);
  }
  return [...new Set(userIds)];
}

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

    // Audit log
    const proj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
    if (proj) {
      logAudit({ workspaceId: proj.workspaceId, userId: data.authorId, action: 'commented', entityType: 'comment', entityId: comment.id, metadata: { taskId: data.taskId, taskTitle: task.title } });
    }

    // Parse @mentions and create MENTIONED notifications
    const mentionedUserIds = parseMentions(data.content);
    const notifiedUserIds = new Set<string>();

    const authorName = comment.author
      ? `${comment.author.firstName} ${comment.author.lastName}`.trim()
      : 'Someone';

    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId === data.authorId) continue; // Don't notify self
      notifiedUserIds.add(mentionedUserId);
      const notification = await prisma.notification.create({
        data: {
          userId: mentionedUserId,
          type: 'MENTIONED',
          title: 'You were mentioned',
          message: `${authorName} mentioned you in a comment on "${task.title}"`,
          resourceType: 'task',
          resourceId: task.id,
        },
      });
      emitToUser(mentionedUserId, 'notification:new', notification);
    }

    // Notify task assignee about new comment (if commenter is different and not already notified via mention)
    if (task.assigneeId && task.assigneeId !== data.authorId && !notifiedUserIds.has(task.assigneeId)) {
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
      notifiedUserIds.add(task.assigneeId);
    }

    // Notify task reporter about new comment (if different from commenter and assignee, and not already notified)
    if (task.reporterId && task.reporterId !== data.authorId && !notifiedUserIds.has(task.reporterId)) {
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

    // Find new mentions that weren't in the old content
    const oldMentions = new Set(parseMentions(comment.content));
    const newMentions = parseMentions(content).filter((uid) => !oldMentions.has(uid));

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: true,
      },
    });

    // Get task for project room and mention notifications
    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
      select: { projectId: true, title: true },
    });
    if (task) {
      emitToProject(task.projectId, 'comment:updated', { ...updated, taskId: comment.taskId });

      // Notify newly mentioned users
      const authorName = updated.author
        ? `${updated.author.firstName} ${updated.author.lastName}`.trim()
        : 'Someone';
      for (const mentionedUserId of newMentions) {
        if (mentionedUserId === userId) continue;
        const notification = await prisma.notification.create({
          data: {
            userId: mentionedUserId,
            type: 'MENTIONED',
            title: 'You were mentioned',
            message: `${authorName} mentioned you in a comment on "${task.title}"`,
            resourceType: 'task',
            resourceId: comment.taskId,
          },
        });
        emitToUser(mentionedUserId, 'notification:new', notification);
      }
    }

    return updated;
  }

  async softDelete(id: string, userId: string, options?: { isProjectAdmin?: boolean }) {
    const comment = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!comment) throw ApiError.notFound('Comment not found');
    if (!options?.isProjectAdmin && comment.authorId !== userId) {
      throw ApiError.forbidden('You can only delete your own comments');
    }

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
      // Audit log
      const proj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
      if (proj) {
        logAudit({ workspaceId: proj.workspaceId, userId, action: 'comment_deleted', entityType: 'comment', entityId: id, metadata: { taskId: comment.taskId } });
      }
    }

    return { id };
  }
}
