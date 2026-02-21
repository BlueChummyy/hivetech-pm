import { prisma } from '../prisma/client.js';

export class UsersService {
  async list(params: { search?: string; page?: number; limit?: number }) {
    // TODO: Query users with pagination and optional search
    throw new Error('Not implemented');
  }

  async getById(id: string) {
    // TODO: Find user by ID
    throw new Error('Not implemented');
  }

  async update(id: string, data: { displayName?: string; avatarUrl?: string }) {
    // TODO: Update user profile
    throw new Error('Not implemented');
  }

  async softDelete(id: string) {
    // TODO: Set deletedAt timestamp
    throw new Error('Not implemented');
  }
}
