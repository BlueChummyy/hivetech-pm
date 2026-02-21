import { prisma } from '../prisma/client.js';

export class LabelsService {
  async create(data: { projectId: string; name: string; color: string }) {
    // TODO: Create label for project
    throw new Error('Not implemented');
  }

  async listByProject(projectId: string) {
    // TODO: Return all labels for a project
    throw new Error('Not implemented');
  }

  async update(id: string, data: { name?: string; color?: string }) {
    // TODO: Update label
    throw new Error('Not implemented');
  }

  async delete(id: string) {
    // TODO: Delete label and associated TaskLabel records
    throw new Error('Not implemented');
  }

  async attachToTask(labelId: string, taskId: string) {
    // TODO: Create TaskLabel junction record
    throw new Error('Not implemented');
  }

  async detachFromTask(labelId: string, taskId: string) {
    // TODO: Delete TaskLabel junction record
    throw new Error('Not implemented');
  }
}
