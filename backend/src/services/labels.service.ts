import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { requireProjectMember } from '../utils/authorization.js';
import { emitToProject } from '../utils/socket.js';
import { logAudit } from './audit.service.js';

export class LabelsService {
  async create(data: { projectId: string; name: string; color: string }, userId: string) {
    await requireProjectMember(data.projectId, userId);

    const existing = await prisma.label.findUnique({
      where: { projectId_name: { projectId: data.projectId, name: data.name } },
    });
    if (existing) {
      throw ApiError.conflict('A label with this name already exists in this project');
    }

    const result = await prisma.label.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        color: data.color,
      },
    });

    emitToProject(data.projectId, 'label:created', result);

    // Audit log
    const project = await prisma.project.findUnique({ where: { id: data.projectId }, select: { workspaceId: true } });
    if (project) {
      logAudit({
        workspaceId: project.workspaceId,
        userId,
        action: 'label_created',
        entityType: 'label',
        entityId: result.id,
        metadata: { name: data.name, color: data.color, projectId: data.projectId },
      });
    }

    return result;
  }

  async listByProject(projectId: string, userId: string) {
    await requireProjectMember(projectId, userId);

    return prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, data: { name?: string; color?: string }, userId: string) {
    const label = await prisma.label.findUnique({ where: { id } });
    if (!label) throw ApiError.notFound('Label not found');

    await requireProjectMember(label.projectId, userId);

    const result = await prisma.label.update({
      where: { id },
      data,
    });

    emitToProject(label.projectId, 'label:updated', result);

    return result;
  }

  async delete(id: string, userId: string) {
    const label = await prisma.label.findUnique({ where: { id } });
    if (!label) throw ApiError.notFound('Label not found');

    await requireProjectMember(label.projectId, userId);

    await prisma.label.delete({ where: { id } });

    emitToProject(label.projectId, 'label:deleted', { id });

    // Audit log
    const projectForDelete = await prisma.project.findUnique({ where: { id: label.projectId }, select: { workspaceId: true } });
    if (projectForDelete) {
      logAudit({
        workspaceId: projectForDelete.workspaceId,
        userId,
        action: 'label_deleted',
        entityType: 'label',
        entityId: id,
        metadata: { name: label.name, projectId: label.projectId },
      });
    }
  }

  async attachToTask(labelId: string, taskId: string, userId: string) {
    const label = await prisma.label.findUnique({ where: { id: labelId } });
    if (!label) throw ApiError.notFound('Label not found');

    const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } });
    if (!task) throw ApiError.notFound('Task not found');

    if (task.projectId !== label.projectId) {
      throw ApiError.badRequest('Task and label must belong to the same project');
    }

    await requireProjectMember(label.projectId, userId);

    const existing = await prisma.taskLabel.findUnique({
      where: { taskId_labelId: { taskId, labelId } },
    });
    if (existing) {
      throw ApiError.conflict('Label is already attached to this task');
    }

    const result = await prisma.taskLabel.create({
      data: { taskId, labelId },
      include: { label: true },
    });

    emitToProject(label.projectId, 'label:attached', { taskId, labelId });

    return result;
  }

  async detachFromTask(labelId: string, taskId: string, userId: string) {
    const label = await prisma.label.findUnique({ where: { id: labelId } });
    if (!label) throw ApiError.notFound('Label not found');

    await requireProjectMember(label.projectId, userId);

    const existing = await prisma.taskLabel.findUnique({
      where: { taskId_labelId: { taskId, labelId } },
    });
    if (!existing) {
      throw ApiError.notFound('Label is not attached to this task');
    }

    await prisma.taskLabel.delete({
      where: { taskId_labelId: { taskId, labelId } },
    });

    emitToProject(label.projectId, 'label:detached', { taskId, labelId });
  }
}
