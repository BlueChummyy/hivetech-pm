import { prisma } from '../prisma/client.js';
import { logger } from '../utils/logger.js';
import { NotificationsService } from './notifications.service.js';

const notificationsService = new NotificationsService();

let intervalId: ReturnType<typeof setInterval> | null = null;

// Run every 15 minutes
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

async function processDueDateNotifications() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find tasks that are due within 24 hours and not yet closed/deleted
  const dueSoonTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      closedAt: null,
      dueDate: {
        gt: now,
        lte: in24Hours,
      },
    },
    include: {
      assignees: { select: { userId: true } },
      project: { select: { name: true } },
    },
  });

  for (const task of dueSoonTasks) {
    // Check if we already sent a DUE_SOON notification for this task today
    const existingNotif = await prisma.notification.findFirst({
      where: {
        resourceId: task.id,
        type: 'DUE_SOON',
        createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existingNotif) continue;

    const dueDate = task.dueDate!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const usersToNotify = new Set<string>();
    for (const a of task.assignees) usersToNotify.add(a.userId);
    if (task.assigneeId) usersToNotify.add(task.assigneeId);
    if (task.reporterId) usersToNotify.add(task.reporterId);

    for (const userId of usersToNotify) {
      await notificationsService.create({
        userId,
        type: 'DUE_SOON',
        title: 'Task due soon',
        message: `"${task.title}" is due on ${dueDate}`,
        resourceType: 'task',
        resourceId: task.id,
        emailData: { taskTitle: task.title, projectName: task.project?.name || '', dueDate },
      });
    }
  }

  // Find tasks that are overdue
  const overdueTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      closedAt: null,
      dueDate: {
        lt: now,
      },
    },
    include: {
      assignees: { select: { userId: true } },
      project: { select: { name: true } },
    },
  });

  for (const task of overdueTasks) {
    // Check if we already sent an OVERDUE notification for this task today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const existingNotif = await prisma.notification.findFirst({
      where: {
        resourceId: task.id,
        type: 'OVERDUE',
        createdAt: { gt: todayStart },
      },
    });
    if (existingNotif) continue;

    const dueDate = task.dueDate!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const usersToNotify = new Set<string>();
    for (const a of task.assignees) usersToNotify.add(a.userId);
    if (task.assigneeId) usersToNotify.add(task.assigneeId);
    if (task.reporterId) usersToNotify.add(task.reporterId);

    for (const userId of usersToNotify) {
      await notificationsService.create({
        userId,
        type: 'OVERDUE',
        title: 'Task overdue',
        message: `"${task.title}" was due on ${dueDate}`,
        resourceType: 'task',
        resourceId: task.id,
        emailData: { taskTitle: task.title, projectName: task.project?.name || '', dueDate },
      });
    }
  }
}

export function startDueDateCron() {
  logger.info('Starting due date notification cron (every 15 min)');
  // Run on startup after a short delay
  setTimeout(() => {
    processDueDateNotifications().catch((err) => {
      logger.error({ error: err }, 'Due date cron initial run failed');
    });
  }, 10_000);

  intervalId = setInterval(async () => {
    try {
      await processDueDateNotifications();
    } catch (err) {
      logger.error({ error: err }, 'Due date cron run failed');
    }
  }, CHECK_INTERVAL_MS);
}

export function stopDueDateCron() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Due date cron stopped');
  }
}
