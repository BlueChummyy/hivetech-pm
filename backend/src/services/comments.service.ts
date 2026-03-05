import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { emitToProject } from '../utils/socket.js';
import { logAudit } from './audit.service.js';
import { NotificationsService } from './notifications.service.js';

const notificationsService = new NotificationsService();

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

    // Truncate comment for email preview
    const commentPreview = data.content.replace(/@\[[^\]]+\]\([^)]+\)/g, (m) => {
      const nameMatch = m.match(/@\[([^\]]+)\]/);
      return nameMatch ? `@${nameMatch[1]}` : m;
    }).slice(0, 200);

    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId === data.authorId) continue;
      notifiedUserIds.add(mentionedUserId);
      await notificationsService.create({
        userId: mentionedUserId,
        type: 'MENTIONED',
        title: 'You were mentioned',
        message: `${authorName} mentioned you in a comment on "${task.title}"`,
        resourceType: 'task',
        resourceId: task.id,
        emailData: { taskTitle: task.title, mentionedBy: authorName, context: commentPreview },
      });
    }

    // Fetch all assignees from junction table
    const taskAssignees = await prisma.taskAssignee.findMany({
      where: { taskId: data.taskId },
      select: { userId: true },
    });

    // Notify all task assignees about new comment
    for (const a of taskAssignees) {
      if (a.userId !== data.authorId && !notifiedUserIds.has(a.userId)) {
        await notificationsService.create({
          userId: a.userId,
          type: 'COMMENT_ADDED',
          title: 'New comment',
          message: `New comment on "${task.title}"`,
          resourceType: 'task',
          resourceId: task.id,
          emailData: { taskTitle: task.title, commentBy: authorName, commentPreview },
        });
        notifiedUserIds.add(a.userId);
      }
    }

    // Also check legacy assigneeId
    if (task.assigneeId && task.assigneeId !== data.authorId && !notifiedUserIds.has(task.assigneeId)) {
      await notificationsService.create({
        userId: task.assigneeId,
        type: 'COMMENT_ADDED',
        title: 'New comment',
        message: `New comment on "${task.title}"`,
        resourceType: 'task',
        resourceId: task.id,
        emailData: { taskTitle: task.title, commentBy: authorName, commentPreview },
      });
      notifiedUserIds.add(task.assigneeId);
    }

    // Notify task reporter about new comment
    if (task.reporterId && task.reporterId !== data.authorId && !notifiedUserIds.has(task.reporterId)) {
      await notificationsService.create({
        userId: task.reporterId,
        type: 'COMMENT_ADDED',
        title: 'New comment',
        message: `New comment on "${task.title}"`,
        resourceType: 'task',
        resourceId: task.id,
        emailData: { taskTitle: task.title, commentBy: authorName, commentPreview },
      });
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
      const mentionPreview = content.replace(/@\[[^\]]+\]\([^)]+\)/g, (m) => {
        const nameMatch = m.match(/@\[([^\]]+)\]/);
        return nameMatch ? `@${nameMatch[1]}` : m;
      }).slice(0, 200);
      for (const mentionedUserId of newMentions) {
        if (mentionedUserId === userId) continue;
        await notificationsService.create({
          userId: mentionedUserId,
          type: 'MENTIONED',
          title: 'You were mentioned',
          message: `${authorName} mentioned you in a comment on "${task.title}"`,
          resourceType: 'task',
          resourceId: comment.taskId,
          emailData: { taskTitle: task.title, mentionedBy: authorName, context: mentionPreview },
        });
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
