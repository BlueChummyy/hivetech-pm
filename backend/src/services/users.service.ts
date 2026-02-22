import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { hashPassword, comparePassword } from '../utils/password.js';

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

export class UsersService {
  async list(params: { search?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
    };

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelectWithoutPassword,
        skip,
        take: limit,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
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
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: userSelectWithoutPassword,
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    const existing = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!existing) throw ApiError.notFound('User not found');

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelectWithoutPassword,
    });

    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null, isActive: true }, omit: { passwordHash: false } });
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

  async update(id: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });
    if (!existing) throw ApiError.notFound('User not found');

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelectWithoutPassword,
    });

    return user;
  }

  async clearAvatar(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: userSelectWithoutPassword,
    });
    return user;
  }

  async softDelete(id: string) {
    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw ApiError.notFound('User not found');

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
