import { prisma } from '../prisma/client.js';
import { emitToProject, emitToWorkspace } from '../utils/socket.js';
import { logger } from '../utils/logger.js';

export interface RecurrenceData {
  recurrenceRule: string | null;
  recurrenceInterval?: number;
  recurrenceDays?: string[];
  recurrenceEndDate?: string | null;
}

/**
 * Calculate the next recurrence date from a given base date.
 */
export function calculateNextRecurrence(
  baseDate: Date,
  rule: string,
  interval: number,
  days: string[],
): Date {
  const next = new Date(baseDate);

  switch (rule) {
    case 'DAILY':
      next.setDate(next.getDate() + interval);
      break;

    case 'WEEKLY': {
      if (days.length === 0) {
        next.setDate(next.getDate() + 7 * interval);
      } else {
        // Find the next matching day of week
        const dayMap: Record<string, number> = {
          SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
        };
        const targetDays = days
          .map((d) => dayMap[d])
          .filter((d) => d !== undefined)
          .sort((a, b) => a - b);

        if (targetDays.length === 0) {
          next.setDate(next.getDate() + 7 * interval);
          break;
        }

        const currentDay = next.getDay();
        // Find next day in current or future weeks
        let found = false;
        for (const targetDay of targetDays) {
          if (targetDay > currentDay) {
            next.setDate(next.getDate() + (targetDay - currentDay));
            found = true;
            break;
          }
        }
        if (!found) {
          // Move to first target day of next interval week
          const daysUntilNextWeek = 7 - currentDay + targetDays[0];
          next.setDate(next.getDate() + daysUntilNextWeek + 7 * (interval - 1));
        }
      }
      break;
    }

    case 'MONTHLY':
      next.setMonth(next.getMonth() + interval);
      break;

    case 'CUSTOM':
      // Custom uses interval as days
      next.setDate(next.getDate() + interval);
      break;

    default:
      next.setDate(next.getDate() + interval);
      break;
  }

  return next;
}

/**
 * Update recurrence settings on a task.
 */
export async function updateTaskRecurrence(taskId: string, data: RecurrenceData) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
  });
  if (!task) throw new Error('Task not found');

  let nextRecurrence: Date | null = null;

  if (data.recurrenceRule) {
    const interval = data.recurrenceInterval ?? 1;
    const days = data.recurrenceDays ?? [];
    nextRecurrence = calculateNextRecurrence(new Date(), data.recurrenceRule, interval, days);

    // If end date is set and next recurrence is past it, don't set nextRecurrence
    if (data.recurrenceEndDate) {
      const endDate = new Date(data.recurrenceEndDate);
      if (nextRecurrence > endDate) {
        nextRecurrence = null;
      }
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      recurrenceRule: data.recurrenceRule,
      recurrenceInterval: data.recurrenceInterval ?? 1,
      recurrenceDays: data.recurrenceDays ?? [],
      recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
      nextRecurrence,
    },
    include: {
      status: true,
      assignee: true,
      reporter: true,
      labels: { include: { label: true } },
      assignees: { include: { user: true } },
    },
  });

  emitToProject(updated.projectId, 'task:updated', updated);

  // Emit to workspace for sidebar updates
  const recProj = await prisma.project.findUnique({ where: { id: updated.projectId }, select: { workspaceId: true } });
  if (recProj) {
    emitToWorkspace(recProj.workspaceId, 'task:updated', { projectId: updated.projectId });
  }

  return updated;
}

/**
 * Process all recurring tasks that are due. Called by the cron job.
 * Finds tasks where nextRecurrence <= now, clones them, and updates nextRecurrence.
 */
export async function processRecurringTasks() {
  const now = new Date();

  const dueTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      recurrenceRule: { not: null },
      nextRecurrence: { lte: now },
    },
    include: {
      labels: true,
      assignees: true,
    },
  });

  logger.info({ count: dueTasks.length }, 'Processing recurring tasks');

  for (const task of dueTasks) {
    try {
      await prisma.$transaction(async (tx: any) => {
        // Increment task counter for new task number
        const project = await tx.project.update({
          where: { id: task.projectId },
          data: { taskCounter: { increment: 1 } },
        });

        // Calculate position: append at end of same status
        const lastTask = await tx.task.findFirst({
          where: { projectId: task.projectId, statusId: task.statusId, deletedAt: null },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = (lastTask?.position ?? 0) + 1000;

        // Get default (first NOT_STARTED) status for fresh task
        const defaultStatus = await tx.projectStatus.findFirst({
          where: { projectId: task.projectId, category: 'NOT_STARTED' },
          orderBy: { position: 'asc' },
        });
        const statusId = defaultStatus?.id ?? task.statusId;

        // Create new task instance
        const newTask = await tx.task.create({
          data: {
            projectId: task.projectId,
            statusId,
            assigneeId: task.assigneeId,
            reporterId: task.reporterId,
            taskNumber: project.taskCounter,
            title: task.title,
            description: task.description,
            priority: task.priority,
            position,
            startDate: task.startDate,
            dueDate: task.dueDate,
            estimatedHours: task.estimatedHours,
          },
        });

        // Clone labels
        if (task.labels.length > 0) {
          await tx.taskLabel.createMany({
            data: task.labels.map((tl: any) => ({
              taskId: newTask.id,
              labelId: tl.labelId,
            })),
          });
        }

        // Clone assignees
        if (task.assignees.length > 0) {
          await tx.taskAssignee.createMany({
            data: task.assignees.map((a: any) => ({
              taskId: newTask.id,
              userId: a.userId,
            })),
          });
        }

        // Calculate and update nextRecurrence on the original task
        const nextDate = calculateNextRecurrence(
          task.nextRecurrence!,
          task.recurrenceRule!,
          task.recurrenceInterval,
          task.recurrenceDays,
        );

        let newNextRecurrence: Date | null = nextDate;
        if (task.recurrenceEndDate && nextDate > task.recurrenceEndDate) {
          newNextRecurrence = null; // End of recurrence
        }

        await tx.task.update({
          where: { id: task.id },
          data: { nextRecurrence: newNextRecurrence },
        });

        // Emit new task event
        const fullTask = await tx.task.findUnique({
          where: { id: newTask.id },
          include: {
            status: true,
            assignee: true,
            reporter: true,
            labels: { include: { label: true } },
            assignees: { include: { user: true } },
          },
        });

        emitToProject(task.projectId, 'task:created', fullTask);

        // Emit to workspace for sidebar updates
        const recCloneProj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
        if (recCloneProj) {
          emitToWorkspace(recCloneProj.workspaceId, 'task:created', { projectId: task.projectId });
        }

        logger.info({ taskId: task.id, newTaskId: newTask.id }, 'Recurring task cloned');
      });
    } catch (err) {
      logger.error({ taskId: task.id, error: err }, 'Failed to process recurring task');
    }
  }
}
