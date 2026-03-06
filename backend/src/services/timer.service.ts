import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { TimeEntriesService } from './time-entries.service.js';
import { logAudit } from './audit.service.js';

const timeEntriesService = new TimeEntriesService();

export class TimerService {
  async start(taskId: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true },
    });
    if (!task) throw ApiError.notFound('Task not found');

    // Stop any existing timer for this user first
    const existing = await prisma.activeTimer.findUnique({
      where: { userId },
    });
    if (existing) {
      await this.stopAndLog(existing, userId);
    }

    // Create new timer
    const timer = await prisma.activeTimer.create({
      data: { taskId, userId },
      include: {
        task: { select: { id: true, title: true, taskNumber: true, projectId: true, project: { select: { workspaceId: true } } } },
      },
    });

    // Audit log
    if (timer.task) {
      logAudit({
        workspaceId: (timer.task as any).project.workspaceId,
        userId,
        action: 'timer_started',
        entityType: 'task',
        entityId: taskId,
        metadata: { taskId, taskTitle: timer.task.title },
      });
    }

    return timer;
  }

  async stop(taskId: string, userId: string) {
    const timer = await prisma.activeTimer.findUnique({
      where: { userId },
    });
    if (!timer) throw ApiError.notFound('No active timer found');
    if (timer.taskId !== taskId) {
      throw ApiError.badRequest('Active timer is on a different task');
    }

    return this.stopAndLog(timer, userId);
  }

  async getActive(userId: string) {
    const timer = await prisma.activeTimer.findUnique({
      where: { userId },
      include: {
        task: { select: { id: true, title: true, taskNumber: true, projectId: true } },
      },
    });
    return timer;
  }

  private async stopAndLog(timer: { id: string; taskId: string; startedAt: Date }, userId: string) {
    const elapsed = Date.now() - timer.startedAt.getTime();
    const hours = Math.round((elapsed / 3600000) * 100) / 100; // Round to 2 decimals

    // Get task info for audit before deleting timer
    const taskForAudit = await prisma.task.findUnique({
      where: { id: timer.taskId },
      select: { title: true, project: { select: { workspaceId: true } } },
    });

    // Delete the timer
    await prisma.activeTimer.delete({ where: { id: timer.id } });

    // Audit log
    if (taskForAudit) {
      logAudit({
        workspaceId: taskForAudit.project.workspaceId,
        userId,
        action: 'timer_stopped',
        entityType: 'task',
        entityId: timer.taskId,
        metadata: { taskId: timer.taskId, taskTitle: taskForAudit.title, duration: hours },
      });
    }

    // Only create a time entry if at least 1 minute has elapsed
    if (hours >= 0.02) {
      const today = new Date().toISOString().split('T')[0];
      const entry = await timeEntriesService.create({
        taskId: timer.taskId,
        userId,
        hours: Math.max(hours, 0.01),
        description: 'Auto-tracked via timer',
        date: today,
      });
      return { entry, hours };
    }

    return { entry: null, hours: 0 };
  }
}
