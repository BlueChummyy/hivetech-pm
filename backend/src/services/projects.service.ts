import { prisma } from '../prisma/client.js';

export class ProjectsService {
  async create(data: { workspaceId: string; name: string; key: string; description?: string }, userId: string) {
    // TODO: Create project with default statuses, add creator as ADMIN
    throw new Error('Not implemented');
  }

  async list(workspaceId: string, userId: string) {
    // TODO: Return projects in workspace where user is a member
    throw new Error('Not implemented');
  }

  async getById(id: string) {
    // TODO: Find project by ID with members and statuses
    throw new Error('Not implemented');
  }

  async update(id: string, data: { name?: string; description?: string }) {
    // TODO: Update project
    throw new Error('Not implemented');
  }

  async delete(id: string) {
    // TODO: Delete project and cascade
    throw new Error('Not implemented');
  }

  async addMember(projectId: string, userId: string, role: string) {
    // TODO: Add user as project member
    throw new Error('Not implemented');
  }

  async updateMember(projectId: string, userId: string, role: string) {
    // TODO: Update project member role
    throw new Error('Not implemented');
  }

  async removeMember(projectId: string, userId: string) {
    // TODO: Remove project member
    throw new Error('Not implemented');
  }

  async listStatuses(projectId: string) {
    // TODO: Return statuses for a project ordered by position
    throw new Error('Not implemented');
  }

  async createStatus(projectId: string, data: { name: string; color: string; category: string; position: number }) {
    // TODO: Create a new status for the project
    throw new Error('Not implemented');
  }

  async updateStatus(statusId: string, data: { name?: string; color?: string; category?: string; position?: number }) {
    // TODO: Update a project status
    throw new Error('Not implemented');
  }

  async deleteStatus(statusId: string) {
    // TODO: Delete a project status (check no tasks reference it)
    throw new Error('Not implemented');
  }
}
