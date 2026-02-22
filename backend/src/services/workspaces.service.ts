import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { requireWorkspaceMember } from '../utils/authorization.js';
import { emitToWorkspace } from '../utils/socket.js';

export class WorkspacesService {
  async create(data: { name: string; slug: string; description?: string }, userId: string) {
    const existing = await prisma.workspace.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw ApiError.conflict('A workspace with this slug already exists');
    }

    const workspace = await prisma.$transaction(async (tx: any) => {
      const ws = await tx.workspace.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId,
          role: 'OWNER',
        },
      });

      return tx.workspace.findUniqueOrThrow({
        where: { id: ws.id },
        include: {
          members: {
            include: { user: true },
          },
        },
      });
    });

    return workspace;
  }

  async listForUser(userId: string) {
    return prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { select: { role: true, userId: true } },
        _count: { select: { projects: true, members: true } },
      },
    });
  }

  async getById(id: string, userId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
        _count: { select: { projects: true, members: true } },
      },
    });

    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const isMember = workspace.members.some((m: any) => m.userId === userId);
    if (!isMember) {
      throw ApiError.forbidden('Not a member of this workspace');
    }

    return workspace;
  }

  async update(id: string, data: { name?: string; description?: string; logoUrl?: string }, userId: string) {
    await requireWorkspaceMember(id, userId, ['OWNER', 'ADMIN']);

    const result = await prisma.workspace.update({
      where: { id },
      data,
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    emitToWorkspace(id, 'workspace:updated', result);

    return result;
  }

  async delete(id: string, userId: string) {
    await requireWorkspaceMember(id, userId, ['OWNER']);

    await prisma.workspace.delete({ where: { id } });

    emitToWorkspace(id, 'workspace:deleted', { id });
  }

  async listMembers(workspaceId: string, userId: string, search?: string) {
    await requireWorkspaceMember(workspaceId, userId);

    const where: any = { workspaceId };
    if (search && search.trim().length > 0) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    return prisma.workspaceMember.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(workspaceId: string, data: { email: string; role: string }, userId: string) {
    await requireWorkspaceMember(workspaceId, userId, ['OWNER', 'ADMIN']);

    const targetUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (!targetUser || !targetUser.isActive || targetUser.deletedAt) {
      throw ApiError.notFound('User not found with that email');
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    });
    if (existing) {
      throw ApiError.conflict('User is already a member of this workspace');
    }

    const result = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: data.role as any,
      },
      include: { user: true },
    });

    emitToWorkspace(workspaceId, 'workspace:member:added', result);

    return result;
  }

  async updateMember(workspaceId: string, targetUserId: string, role: string, userId: string) {
    await requireWorkspaceMember(workspaceId, userId, ['OWNER', 'ADMIN']);

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });

    if (!target) {
      throw ApiError.notFound('Member not found');
    }

    if (target.role === 'OWNER') {
      throw ApiError.badRequest('Cannot change the role of the workspace owner');
    }

    const result = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: role as any },
      include: { user: true },
    });

    emitToWorkspace(workspaceId, 'workspace:member:updated', result);

    return result;
  }

  async removeMember(workspaceId: string, targetUserId: string, userId: string) {
    // Allow self-removal or OWNER/ADMIN removal
    if (targetUserId !== userId) {
      await requireWorkspaceMember(workspaceId, userId, ['OWNER', 'ADMIN']);
    }

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });

    if (!target) {
      throw ApiError.notFound('Member not found');
    }

    if (target.role === 'OWNER') {
      throw ApiError.badRequest('Cannot remove the workspace owner');
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });

    emitToWorkspace(workspaceId, 'workspace:member:removed', { workspaceId, userId: targetUserId });
  }
}
