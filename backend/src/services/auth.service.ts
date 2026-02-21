import { prisma } from '../prisma/client.js';

export class AuthService {
  async register(email: string, password: string, displayName: string) {
    // TODO: Hash password, create user, generate tokens
    throw new Error('Not implemented');
  }

  async login(email: string, password: string) {
    // TODO: Find user, verify password, generate tokens
    throw new Error('Not implemented');
  }

  async refresh(refreshToken: string) {
    // TODO: Verify refresh token, generate new token pair
    throw new Error('Not implemented');
  }

  async logout(userId: string, refreshToken: string) {
    // TODO: Delete refresh token from database
    throw new Error('Not implemented');
  }

  async getProfile(userId: string) {
    // TODO: Find and return user profile
    throw new Error('Not implemented');
  }
}
