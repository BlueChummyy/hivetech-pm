import { prisma } from '../prisma/client.js';
import { emitToUser } from '../utils/socket.js';

export class NotificationsService {
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
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
    return prisma.notification.updateMany({
      where: { id, userId },
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
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  }
}
