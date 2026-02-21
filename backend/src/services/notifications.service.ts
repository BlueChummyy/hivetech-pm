import { prisma } from '../prisma/client.js';

export class NotificationsService {
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    // TODO: Create notification, emit via Socket.io
    throw new Error('Not implemented');
  }

  async listForUser(userId: string, params: { page?: number; limit?: number; unreadOnly?: boolean }) {
    // TODO: Return notifications for user, paginated, optionally filtered by read status
    throw new Error('Not implemented');
  }

  async markAsRead(id: string) {
    // TODO: Set isRead to true
    throw new Error('Not implemented');
  }

  async markAllAsRead(userId: string) {
    // TODO: Set isRead to true for all user notifications
    throw new Error('Not implemented');
  }

  async delete(id: string) {
    // TODO: Delete notification
    throw new Error('Not implemented');
  }
}
