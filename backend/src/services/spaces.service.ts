import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { requireWorkspaceMember } from '../utils/authorization.js';
import { emitToWorkspace } from '../utils/socket.js';
import { logAudit } from './audit.service.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class SpacesService {
  async create(
    data: { workspaceId: string; name: string; description?: string; color?: string; icon?: string },
    userId: string,
  ) {
    await requireWorkspaceMember(data.workspaceId, userId, ['OWNER', 'ADMIN']);

    const slug = slugify(data.name);
    const existing = await prisma.space.findUnique({
      where: { workspaceId_slug: { workspaceId: data.workspaceId, slug } },
    });
    if (existing) {
      throw ApiError.conflict('A space with this name already exists in this workspace');
    }

    const lastSpace = await prisma.space.findFirst({
      where: { workspaceId: data.workspaceId },
      orderBy: { position: 'desc' },
    });
    const position = (lastSpace?.position ?? 0) + 1000;

    const space = await prisma.space.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        slug,
        description: data.description,
        color: data.color,
        icon: data.icon,
        position,
      },
      include: {
        _count: { select: { projects: true } },
      },
    });

    emitToWorkspace(data.workspaceId, 'space:created', space);

    logAudit({ workspaceId: data.workspaceId, userId, action: 'created', entityType: 'space', entityId: space.id, metadata: { name: data.name } });

    return space;
  }

  async list(workspaceId: string, userId: string) {
    await requireWorkspaceMember(workspaceId, userId);

    return prisma.space.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { position: 'asc' },
      include: {
        projects: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { tasks: { where: { deletedAt: null, closedAt: null } } } },
          },
        },
        _count: { select: { projects: { where: { deletedAt: null } } } },
      },
    });
  }

  async getById(id: string, userId: string) {
    const space = await prisma.space.findUnique({
      where: { id },
      include: {
        projects: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { tasks: { where: { deletedAt: null, closedAt: null } } } },
          },
        },
        _count: { select: { projects: { where: { deletedAt: null } } } },
      },
    });
    if (!space) throw ApiError.notFound('Space not found');

    await requireWorkspaceMember(space.workspaceId, userId);
    return space;
  }

  async update(id: string, data: { name?: string; description?: string; color?: string; icon?: string; position?: number }, userId: string) {
    const space = await prisma.space.findUnique({ where: { id } });
    if (!space) throw ApiError.notFound('Space not found');

    await requireWorkspaceMember(space.workspaceId, userId, ['OWNER', 'ADMIN']);

    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = slugify(data.name);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.position !== undefined) updateData.position = data.position;

    const updated = await prisma.space.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { projects: true } },
      },
    });

    emitToWorkspace(space.workspaceId, 'space:updated', updated);

    logAudit({ workspaceId: space.workspaceId, userId, action: 'updated', entityType: 'space', entityId: id, metadata: { changes: data } });

    return updated;
  }

  async delete(id: string, userId: string) {
    const space = await prisma.space.findUnique({ where: { id } });
    if (!space) throw ApiError.notFound('Space not found');
    if (space.deletedAt) throw ApiError.notFound('Space not found');

    await requireWorkspaceMember(space.workspaceId, userId, ['OWNER', 'ADMIN']);

    // Unlink projects from this space (set spaceId to null) rather than deleting them
    await prisma.project.updateMany({
      where: { spaceId: id },
      data: { spaceId: null },
    });

    // Soft-delete the space
    await prisma.space.update({ where: { id }, data: { deletedAt: new Date() } });

    emitToWorkspace(space.workspaceId, 'space:deleted', { id });

    logAudit({ workspaceId: space.workspaceId, userId, action: 'deleted', entityType: 'space', entityId: id, metadata: { name: space.name } });
  }
}
