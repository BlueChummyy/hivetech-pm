import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { requireWorkspaceMember } from '../utils/authorization.js';
import { emitToWorkspace, emitToProject } from '../utils/socket.js';

export class ProjectsService {
  async create(data: { workspaceId: string; name: string; key: string; description?: string }, userId: string) {
    await requireWorkspaceMember(data.workspaceId, userId, ['OWNER', 'ADMIN', 'MEMBER']);

    const existingKey = await prisma.project.findUnique({
      where: { workspaceId_key: { workspaceId: data.workspaceId, key: data.key } },
    });
    if (existingKey) {
      throw ApiError.conflict('A project with this key already exists in this workspace');
    }

    const project = await prisma.$transaction(async (tx: any) => {
      const proj = await tx.project.create({
        data: {
          workspaceId: data.workspaceId,
          name: data.name,
          key: data.key,
          description: data.description,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: proj.id,
          userId,
          role: 'ADMIN',
        },
      });

      await tx.projectStatus.createMany({
        data: [
          { projectId: proj.id, name: 'Backlog', color: '#6B7280', category: 'NOT_STARTED', position: 1.0, isDefault: true },
          { projectId: proj.id, name: 'In Progress', color: '#3B82F6', category: 'ACTIVE', position: 2.0 },
          { projectId: proj.id, name: 'In Review', color: '#F59E0B', category: 'ACTIVE', position: 3.0 },
          { projectId: proj.id, name: 'Done', color: '#10B981', category: 'DONE', position: 4.0 },
        ],
      });

      return tx.project.findUniqueOrThrow({
        where: { id: proj.id },
        include: {
          statuses: { orderBy: { position: 'asc' } },
          members: {
            include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
          },
          _count: { select: { tasks: true, members: true } },
        },
      });
    });

    emitToWorkspace(project.workspaceId, 'project:created', project);

    return project;
  }

  async list(workspaceId: string, userId: string) {
    await requireWorkspaceMember(workspaceId, userId);

    return prisma.project.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { tasks: true, members: true } },
      },
    });
  }

  async getById(id: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        statuses: { orderBy: { position: 'asc' } },
        members: {
          include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
        },
        _count: { select: { tasks: true, members: true } },
      },
    });

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Check project membership or workspace membership
    const isProjectMember = project.members.some((m: any) => m.userId === userId);
    if (!isProjectMember) {
      // Fall back to workspace membership
      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
      });
      if (!wsMember) {
        throw ApiError.forbidden('Not a member of this project or workspace');
      }
    }

    return project;
  }

  async update(id: string, data: { name?: string; description?: string }, userId: string) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw ApiError.notFound('Project not found');

    // Must be project ADMIN or workspace OWNER/ADMIN
    const projectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
    });

    const hasProjectAdmin = projectMember?.role === 'ADMIN';
    const hasWsAdmin = wsMember && ['OWNER', 'ADMIN'].includes(wsMember.role);

    if (!hasProjectAdmin && !hasWsAdmin) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: {
        statuses: { orderBy: { position: 'asc' } },
        members: {
          include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
        },
      },
    });

    emitToWorkspace(project.workspaceId, 'project:updated', updated);

    return updated;
  }

  async delete(id: string, userId: string) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw ApiError.notFound('Project not found');

    const projectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
    });

    const hasProjectAdmin = projectMember?.role === 'ADMIN';
    const hasWsOwner = wsMember?.role === 'OWNER';

    if (!hasProjectAdmin && !hasWsOwner) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    await prisma.project.delete({ where: { id } });

    emitToWorkspace(project.workspaceId, 'project:deleted', { id });
  }

  async addMember(projectId: string, data: { userId: string; role: string }, requesterId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    // Requester must be project ADMIN or workspace OWNER/ADMIN
    const requesterProjectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: requesterId } },
    });
    const requesterWsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: requesterId } },
    });

    const hasPermission =
      requesterProjectMember?.role === 'ADMIN' ||
      (requesterWsMember && ['OWNER', 'ADMIN'].includes(requesterWsMember.role));

    if (!hasPermission) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    // Target must be workspace member
    const targetWsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: data.userId } },
    });
    if (!targetWsMember) {
      throw ApiError.badRequest('User must be a workspace member before being added to a project');
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: data.userId } },
    });
    if (existing) {
      throw ApiError.conflict('User is already a member of this project');
    }

    const result = await prisma.projectMember.create({
      data: {
        projectId,
        userId: data.userId,
        role: data.role as any,
      },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });

    emitToProject(projectId, 'member:added', result);
    emitToWorkspace(project.workspaceId, 'project:updated', { id: projectId });

    return result;
  }

  async updateMember(projectId: string, targetUserId: string, role: string, requesterId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    const requesterProjectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: requesterId } },
    });
    const requesterWsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: requesterId } },
    });

    const hasPermission =
      requesterProjectMember?.role === 'ADMIN' ||
      (requesterWsMember && ['OWNER', 'ADMIN'].includes(requesterWsMember.role));

    if (!hasPermission) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) {
      throw ApiError.notFound('Member not found');
    }

    const result = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      data: { role: role as any },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });

    emitToProject(projectId, 'member:updated', result);

    return result;
  }

  async removeMember(projectId: string, targetUserId: string, requesterId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    if (targetUserId !== requesterId) {
      const requesterProjectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: requesterId } },
      });
      const requesterWsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: requesterId } },
      });

      const hasPermission =
        requesterProjectMember?.role === 'ADMIN' ||
        (requesterWsMember && ['OWNER', 'ADMIN'].includes(requesterWsMember.role));

      if (!hasPermission) {
        throw ApiError.forbidden('Insufficient permissions');
      }
    }

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) {
      throw ApiError.notFound('Member not found');
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    emitToProject(projectId, 'member:removed', { projectId, userId: targetUserId });
  }

  async listStatuses(projectId: string, userId: string) {
    // Verify access via project or workspace membership
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');
    await requireWorkspaceMember(project.workspaceId, userId);

    return prisma.projectStatus.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });
  }

  async createStatus(projectId: string, data: { name: string; color: string; category: string; position?: number }, userId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');
    await requireWorkspaceMember(project.workspaceId, userId);

    let position = data.position;
    if (position === undefined) {
      const maxStatus = await prisma.projectStatus.findFirst({
        where: { projectId },
        orderBy: { position: 'desc' },
      });
      position = maxStatus ? maxStatus.position + 1 : 1.0;
    }

    const result = await prisma.projectStatus.create({
      data: {
        projectId,
        name: data.name,
        color: data.color,
        category: data.category as any,
        position,
      },
    });

    emitToProject(projectId, 'status:created', result);

    return result;
  }

  async updateStatus(statusId: string, data: { name?: string; color?: string; category?: string; position?: number; isDefault?: boolean }, userId: string) {
    const status = await prisma.projectStatus.findUnique({ where: { id: statusId } });
    if (!status) throw ApiError.notFound('Status not found');

    const project = await prisma.project.findUnique({ where: { id: status.projectId } });
    if (!project) throw ApiError.notFound('Project not found');
    await requireWorkspaceMember(project.workspaceId, userId);

    let result;
    if (data.isDefault === true) {
      result = await prisma.$transaction(async (tx: any) => {
        await tx.projectStatus.updateMany({
          where: { projectId: status.projectId, isDefault: true },
          data: { isDefault: false },
        });
        return tx.projectStatus.update({
          where: { id: statusId },
          data,
        });
      });
    } else {
      result = await prisma.projectStatus.update({
        where: { id: statusId },
        data: data as any,
      });
    }

    emitToProject(status.projectId, 'status:updated', result);

    return result;
  }

  async deleteStatus(statusId: string, reassignToStatusId?: string, userId?: string) {
    const status = await prisma.projectStatus.findUnique({ where: { id: statusId } });
    if (!status) throw ApiError.notFound('Status not found');

    if (userId) {
      const project = await prisma.project.findUnique({ where: { id: status.projectId } });
      if (!project) throw ApiError.notFound('Project not found');
      await requireWorkspaceMember(project.workspaceId, userId);
    }

    if (status.isDefault) {
      throw ApiError.badRequest('Cannot delete the default status');
    }

    // Only count non-deleted tasks when checking if reassignment is needed
    const taskCount = await prisma.task.count({ where: { statusId, deletedAt: null } });

    if (taskCount > 0 && !reassignToStatusId) {
      throw ApiError.badRequest('Must provide reassignToStatusId when tasks exist on this status');
    }

    if (taskCount > 0 && reassignToStatusId) {
      const targetStatus = await prisma.projectStatus.findUnique({ where: { id: reassignToStatusId } });
      if (!targetStatus || targetStatus.projectId !== status.projectId) {
        throw ApiError.badRequest('reassignToStatusId must belong to the same project');
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.task.updateMany({
          where: { statusId, deletedAt: null },
          data: { statusId: reassignToStatusId },
        });
        await tx.projectStatus.delete({ where: { id: statusId } });
      });

      emitToProject(status.projectId, 'status:deleted', { id: statusId });
      return;
    }

    await prisma.projectStatus.delete({ where: { id: statusId } });

    emitToProject(status.projectId, 'status:deleted', { id: statusId });
  }
}
