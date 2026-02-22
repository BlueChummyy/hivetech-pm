import crypto from 'node:crypto';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken } from '../utils/token.js';
import { env } from '../config/index.js';

function computeRefreshExpiry(): Date {
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + value * multipliers[unit]);
}

const userSelectWithoutPassword = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class AuthService {
  async register(email: string, password: string, firstName: string, lastName: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Don't reveal whether the account is active or deleted
      throw ApiError.conflict('A user with this email already exists');
    }

    const passwordHash = await hashPassword(password);
    const refreshTokenValue = crypto.randomUUID();

    const newUser = await prisma.$transaction(async (tx: any) => {
      const created = await tx.user.create({
        data: { email, passwordHash, firstName, lastName },
      });

      // Add the new user to the default workspace so they can use the app
      const defaultWorkspace = await tx.workspace.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (defaultWorkspace) {
        await tx.workspaceMember.create({
          data: {
            workspaceId: defaultWorkspace.id,
            userId: created.id,
            role: 'MEMBER',
          },
        });
      }

      await tx.refreshToken.create({
        data: {
          token: refreshTokenValue,
          userId: created.id,
          expiresAt: computeRefreshExpiry(),
        },
      });

      return created;
    });

    // Re-fetch with select to exclude passwordHash from the response
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: newUser.id },
      select: userSelectWithoutPassword,
    });

    const accessToken = generateAccessToken({ sub: user.id, email: user.email });

    return { user, accessToken, refreshToken: refreshTokenValue };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } });
    if (!user || !user.isActive || user.deletedAt) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const accessToken = generateAccessToken({ sub: user.id, email: user.email });
    const refreshTokenValue = crypto.randomUUID();

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: computeRefreshExpiry(),
      },
    });

    // Re-fetch user without password hash for the response
    const safeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: userSelectWithoutPassword,
    });

    return { user: safeUser, accessToken, refreshToken: refreshTokenValue };
  }

  async refresh(refreshToken: string) {
    // Opportunistically prune expired tokens (limit to small batch to avoid blocking)
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true, isActive: true, deletedAt: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Check if user is still active
    if (!stored.user.isActive || stored.user.deletedAt) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw ApiError.unauthorized('User account is deactivated');
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccessToken = generateAccessToken({ sub: stored.user.id, email: stored.user.email });
    const newRefreshTokenValue = crypto.randomUUID();

    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenValue,
        userId: stored.user.id,
        expiresAt: computeRefreshExpiry(),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshTokenValue };
  }

  async logout(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      select: userSelectWithoutPassword,
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }
}
