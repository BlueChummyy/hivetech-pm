import { prisma } from '../prisma/client.js';

export class CommentsService {
  async create(data: { taskId: string; authorId: string; content: string }) {
    // TODO: Create comment, trigger notification
    throw new Error('Not implemented');
  }

  async listByTask(taskId: string, params: { page?: number; limit?: number }) {
    // TODO: Return comments for a task, exclude soft-deleted, paginated
    throw new Error('Not implemented');
  }

  async update(id: string, content: string) {
    // TODO: Update comment content
    throw new Error('Not implemented');
  }

  async softDelete(id: string) {
    // TODO: Set deletedAt timestamp
    throw new Error('Not implemented');
  }
}
