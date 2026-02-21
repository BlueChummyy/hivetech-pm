import { prisma } from '../prisma/client.js';

export class AttachmentsService {
  async create(data: {
    taskId: string;
    uploadedById: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }) {
    // TODO: Create attachment record
    throw new Error('Not implemented');
  }

  async listByTask(taskId: string) {
    // TODO: Return attachments for a task
    throw new Error('Not implemented');
  }

  async getById(id: string) {
    // TODO: Find attachment by ID
    throw new Error('Not implemented');
  }

  async delete(id: string) {
    // TODO: Delete attachment record and file from storage
    throw new Error('Not implemented');
  }
}
