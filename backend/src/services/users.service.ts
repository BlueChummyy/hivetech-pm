import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { hashPassword, comparePassword } from '../utils/password.js';

const userSelectWithoutPassword = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UsersService {
  async list(params: { search?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
    };

    if (params.search) {
      where.OR = [
        { displayName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelectWithoutPassword,
        skip,
        take: limit,
        orderBy: { displayName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelectWithoutPassword,
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelectWithoutPassword,
    });

    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const valid = await comparePassword(oldPassword, user.passwordHash);
    if (!valid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async update(id: string, data: { displayName?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelectWithoutPassword,
    });

    return user;
  }

  async softDelete(id: string) {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
