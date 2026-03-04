import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { emitToProject } from '../utils/socket.js';
import { logAudit } from './audit.service.js';

export class TimeEntriesService {
  async create(data: { taskId: string; userId: string; hours: number; description?: string; date: string }) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, deletedAt: null },
      select: { id: true, projectId: true, title: true },
    });
    if (!task) throw ApiError.notFound('Task not found');

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: data.taskId,
        userId: data.userId,
        hours: data.hours,
        description: data.description,
        date: new Date(data.date),
      },
      include: {
        user: true,
      },
    });

    emitToProject(task.projectId, 'time-entry:created', { ...entry, taskId: data.taskId });

    // Audit log
    const proj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
    if (proj) {
      logAudit({
        workspaceId: proj.workspaceId,
        userId: data.userId,
        action: 'logged_time',
        entityType: 'time_entry',
        entityId: entry.id,
        metadata: { taskId: data.taskId, taskTitle: task.title, hours: data.hours },
      });
    }

    return entry;
  }

  async listByTask(taskId: string) {
    const entries = await prisma.timeEntry.findMany({
      where: { taskId },
      orderBy: { date: 'desc' },
      include: {
        user: true,
      },
    });

    // Calculate total hours
    const totalHours = entries.reduce((sum: number, e: { hours: unknown }) => sum + Number(e.hours), 0);

    return { entries, totalHours };
  }

  async update(id: string, data: { hours?: number; description?: string; date?: string }, userId: string) {
    const entry = await prisma.timeEntry.findUnique({
      where: { id },
    });
    if (!entry) throw ApiError.notFound('Time entry not found');
    if (entry.userId !== userId) throw ApiError.forbidden('You can only edit your own time entries');

    const updateData: any = {};
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });

    // Emit update
    const task = await prisma.task.findUnique({
      where: { id: entry.taskId },
      select: { projectId: true },
    });
    if (task) {
      emitToProject(task.projectId, 'time-entry:updated', { ...updated, taskId: entry.taskId });
    }

    return updated;
  }

  async delete(id: string, userId: string, options?: { isProjectAdmin?: boolean }) {
    const entry = await prisma.timeEntry.findUnique({
      where: { id },
    });
    if (!entry) throw ApiError.notFound('Time entry not found');
    if (!options?.isProjectAdmin && entry.userId !== userId) {
      throw ApiError.forbidden('You can only delete your own time entries');
    }

    await prisma.timeEntry.delete({
      where: { id },
    });

    // Emit delete
    const task = await prisma.task.findUnique({
      where: { id: entry.taskId },
      select: { projectId: true },
    });
    if (task) {
      emitToProject(task.projectId, 'time-entry:deleted', { id, taskId: entry.taskId });

      // Audit log
      const proj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
      if (proj) {
        logAudit({
          workspaceId: proj.workspaceId,
          userId,
          action: 'deleted_time_entry',
          entityType: 'time_entry',
          entityId: id,
          metadata: { taskId: entry.taskId },
        });
      }
    }

    return { id };
  }
}
