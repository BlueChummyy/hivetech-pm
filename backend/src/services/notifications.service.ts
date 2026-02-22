import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { emitToUser } from '../utils/socket.js';
import {
  isEmailConfigured,
  sendTaskAssignedEmail,
  sendCommentNotificationEmail,
  sendStatusChangeEmail,
} from './email.service.js';

export class NotificationsService {
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
    emailData?: {
      taskTitle?: string;
      projectName?: string;
      assignedBy?: string;
      commentBy?: string;
      commentPreview?: string;
      oldStatus?: string;
      newStatus?: string;
      changedBy?: string;
    };
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
      },
    });

    emitToUser(data.userId, 'notification:new', notification);

    // Send email notification if SMTP is configured
    if (isEmailConfigured() && data.emailData) {
      const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { email: true } });
      if (user?.email) {
        const ed = data.emailData;
        switch (data.type) {
          case 'TASK_ASSIGNED':
            if (ed.taskTitle && ed.projectName && ed.assignedBy) {
              sendTaskAssignedEmail(user.email, { taskTitle: ed.taskTitle, projectName: ed.projectName, assignedBy: ed.assignedBy });
            }
            break;
          case 'COMMENT_ADDED':
            if (ed.taskTitle && ed.commentBy && ed.commentPreview) {
              sendCommentNotificationEmail(user.email, { taskTitle: ed.taskTitle, commentBy: ed.commentBy, commentPreview: ed.commentPreview });
            }
            break;
          case 'STATUS_CHANGED':
            if (ed.taskTitle && ed.oldStatus && ed.newStatus && ed.changedBy) {
              sendStatusChangeEmail(user.email, { taskTitle: ed.taskTitle, oldStatus: ed.oldStatus, newStatus: ed.newStatus, changedBy: ed.changedBy });
            }
            break;
        }
      }
    }

    return notification;
  }

  async listForUser(userId: string, params: { page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where = { userId };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw ApiError.notFound('Notification not found');

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw ApiError.notFound('Notification not found');

    return prisma.notification.delete({
      where: { id },
    });
  }
}
