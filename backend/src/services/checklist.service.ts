import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { logAudit } from './audit.service.js';

export class ChecklistService {
  async create(data: { taskId: string; title: string }, userId?: string) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw ApiError.notFound('Task not found');

    // Get max position for ordering
    const lastItem = await prisma.checklistItem.findFirst({
      where: { taskId: data.taskId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (lastItem?.position ?? 0) + 1;

    const item = await prisma.checklistItem.create({
      data: {
        taskId: data.taskId,
        title: data.title,
        position,
      },
    });

    // Audit log
    if (userId) {
      const taskForAudit = await prisma.task.findUnique({
        where: { id: data.taskId },
        select: { projectId: true, project: { select: { workspaceId: true } } },
      });
      if (taskForAudit) {
        logAudit({
          workspaceId: taskForAudit.project.workspaceId,
          userId,
          action: 'checklist_item_created',
          entityType: 'task',
          entityId: data.taskId,
          metadata: { taskId: data.taskId, itemText: data.title },
        });
      }
    }

    return item;
  }

  async list(taskId: string) {
    return prisma.checklistItem.findMany({
      where: { taskId },
      orderBy: { position: 'asc' },
    });
  }

  async update(id: string, data: { title?: string; isChecked?: boolean }, userId?: string) {
    const item = await prisma.checklistItem.findUnique({ where: { id } });
    if (!item) throw ApiError.notFound('Checklist item not found');

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.isChecked !== undefined) updateData.isChecked = data.isChecked;

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    if (userId) {
      const taskForAudit = await prisma.task.findUnique({
        where: { id: item.taskId },
        select: { projectId: true, project: { select: { workspaceId: true } } },
      });
      if (taskForAudit) {
        logAudit({
          workspaceId: taskForAudit.project.workspaceId,
          userId,
          action: 'checklist_item_updated',
          entityType: 'task',
          entityId: item.taskId,
          metadata: {
            taskId: item.taskId,
            itemText: updated.title,
            ...(data.isChecked !== undefined ? { checked: data.isChecked } : {}),
          },
        });
      }
    }

    return updated;
  }

  async delete(id: string, userId?: string) {
    const item = await prisma.checklistItem.findUnique({ where: { id } });
    if (!item) throw ApiError.notFound('Checklist item not found');

    await prisma.checklistItem.delete({ where: { id } });

    // Audit log
    if (userId) {
      const taskForAudit = await prisma.task.findUnique({
        where: { id: item.taskId },
        select: { projectId: true, project: { select: { workspaceId: true } } },
      });
      if (taskForAudit) {
        logAudit({
          workspaceId: taskForAudit.project.workspaceId,
          userId,
          action: 'checklist_item_deleted',
          entityType: 'task',
          entityId: item.taskId,
          metadata: { taskId: item.taskId, itemText: item.title },
        });
      }
    }

    return { id };
  }

  async reorder(taskId: string, items: { id: string; position: number }[]) {
    const updates = items.map((item) =>
      prisma.checklistItem.update({
        where: { id: item.id },
        data: { position: item.position },
      }),
    );
    await prisma.$transaction(updates);
    return this.list(taskId);
  }
}
