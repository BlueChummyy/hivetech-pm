import { prisma } from '../prisma/client.js';

export class TasksService {
  async create(data: {
    projectId: string;
    title: string;
    description?: string;
    statusId: string;
    assigneeId?: string;
    reporterId: string;
    parentId?: string;
    priority?: string;
    dueDate?: Date;
    estimatedHours?: number;
  }) {
    // TODO: Increment project taskCounter, create task with taskNumber
    throw new Error('Not implemented');
  }

  async list(filters: {
    projectId: string;
    statusId?: string;
    assigneeId?: string;
    priority?: string;
    parentId?: string;
    page?: number;
    limit?: number;
  }) {
    // TODO: Query tasks with filters, pagination, exclude soft-deleted
    throw new Error('Not implemented');
  }

  async getById(id: string) {
    // TODO: Find task by ID with relations (status, assignee, reporter, labels, comments)
    throw new Error('Not implemented');
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    statusId?: string;
    assigneeId?: string | null;
    priority?: string;
    position?: number;
    dueDate?: Date | null;
    estimatedHours?: number | null;
  }) {
    // TODO: Update task fields
    throw new Error('Not implemented');
  }

  async softDelete(id: string) {
    // TODO: Set deletedAt timestamp
    throw new Error('Not implemented');
  }

  async addDependency(taskId: string, dependsOnTaskId: string, type: string) {
    // TODO: Create task dependency (check for cycles)
    throw new Error('Not implemented');
  }

  async removeDependency(dependencyId: string) {
    // TODO: Delete task dependency
    throw new Error('Not implemented');
  }

  async updatePosition(id: string, position: number, statusId?: string) {
    // TODO: Update task position and optionally status (for drag & drop)
    throw new Error('Not implemented');
  }
}
