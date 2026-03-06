import { prisma } from '../prisma/client.js';

export type DashboardFilter =
  | 'active'
  | 'completed'
  | 'in_progress'
  | 'overdue'
  | 'due_this_week'
  | 'unassigned';

export class DashboardService {
  async getStats(workspaceId: string) {
    // Get all projects in the workspace
    const projects = await prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true, key: true },
    });

    const projectIds = projects.map((p: any) => p.id);

    if (projectIds.length === 0) {
      return {
        summary: {
          active: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
          dueThisWeek: 0,
          unassigned: 0,
        },
        byStatus: [] as { category: string; count: number }[],
        byPriority: [] as { priority: string; count: number }[],
        byAssignee: [] as { userId: string | null; name: string; avatarUrl: string | null; count: number }[],
        projectProgress: [] as { projectId: string; name: string; key: string; total: number; done: number; percentage: number }[],
        recentActivity: [] as any[],
      };
    }

    // Get all non-deleted tasks for this workspace's projects
    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
      },
      select: {
        id: true,
        projectId: true,
        priority: true,
        dueDate: true,
        statusId: true,
        assigneeId: true,
        createdAt: true,
        updatedAt: true,
        status: {
          select: { category: true },
        },
        assignees: {
          select: {
            userId: true,
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Summary counts
    let activeCount = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let dueThisWeek = 0;
    let unassigned = 0;

    // By status category
    const statusCounts: Record<string, number> = {
      NOT_STARTED: 0,
      ACTIVE: 0,
      DONE: 0,
      CANCELLED: 0,
    };

    // By priority
    const priorityCounts: Record<string, number> = {
      URGENT: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      NONE: 0,
    };

    // By assignee (only non-DONE, non-CANCELLED tasks)
    const assigneeCounts: Map<string, { name: string; avatarUrl: string | null; count: number }> = new Map();

    // Project progress (only non-DONE, non-CANCELLED tasks)
    const projectTaskCounts: Map<string, { total: number; done: number }> = new Map();
    for (const p of projects) {
      projectTaskCounts.set(p.id, { total: 0, done: 0 });
    }

    for (const task of tasks) {
      const category = task.status?.category || 'NOT_STARTED';

      // Status counts (all tasks)
      if (statusCounts[category] !== undefined) {
        statusCounts[category]++;
      }

      // Priority counts (exclude completed and cancelled tasks)
      if (priorityCounts[task.priority] !== undefined && category !== 'DONE' && category !== 'CANCELLED') {
        priorityCounts[task.priority]++;
      }

      // Summary
      if (category === 'ACTIVE') {
        activeCount++;
        inProgress++;
      }
      if (category === 'DONE') completed++;

      // Only count overdue for non-completed tasks
      if (task.dueDate && new Date(task.dueDate) < now && category !== 'DONE' && category !== 'CANCELLED') {
        overdue++;
      }

      // Due this week (non-completed tasks)
      if (task.dueDate && category !== 'DONE' && category !== 'CANCELLED') {
        const due = new Date(task.dueDate);
        if (due >= now && due <= weekFromNow) {
          dueThisWeek++;
        }
      }

      // Assignee tracking - only for non-DONE, non-CANCELLED tasks
      const isActive = category !== 'DONE' && category !== 'CANCELLED';
      const taskAssignees = task.assignees || [];

      if (taskAssignees.length === 0) {
        unassigned++;
        if (isActive) {
          const existing = assigneeCounts.get('unassigned');
          if (existing) {
            existing.count++;
          } else {
            assigneeCounts.set('unassigned', { name: 'Unassigned', avatarUrl: null, count: 1 });
          }
        }
      } else if (isActive) {
        for (const a of taskAssignees) {
          const key = a.userId;
          const existing = assigneeCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            const userName = `${a.user.firstName} ${a.user.lastName}`.trim();
            assigneeCounts.set(key, { name: userName, avatarUrl: a.user.avatarUrl, count: 1 });
          }
        }
      }

      // Project progress - only count non-DONE, non-CANCELLED tasks
      if (isActive) {
        const pc = projectTaskCounts.get(task.projectId);
        if (pc) {
          pc.total++;
        }
      }
    }

    // Build byStatus array
    const byStatus = Object.entries(statusCounts).map(([category, count]) => ({
      category,
      count,
    }));

    // Build byPriority array
    const byPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
    }));

    // Build byAssignee array (sorted by count descending)
    const byAssignee = Array.from(assigneeCounts.entries())
      .map(([userId, data]) => ({
        userId: userId === 'unassigned' ? null : userId,
        name: data.name,
        avatarUrl: data.avatarUrl,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Build projectProgress array (total = active tasks only)
    const projectProgress = projects
      .map((p: any) => {
        const pc = projectTaskCounts.get(p.id)!;
        return {
          projectId: p.id,
          name: p.name,
          key: p.key,
          total: pc.total,
          done: pc.done,
          percentage: pc.total > 0 ? Math.round((pc.done / pc.total) * 100) : 0,
        };
      })
      .filter((p: any) => p.total > 0)
      .sort((a: any, b: any) => b.total - a.total);

    // Recent activity
    const recentActivity = await prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return {
      summary: {
        active: activeCount,
        completed,
        inProgress,
        overdue,
        dueThisWeek,
        unassigned,
      },
      byStatus,
      byPriority,
      byAssignee,
      projectProgress,
      recentActivity: recentActivity.map((log: any) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt,
        user: {
          id: log.user.id,
          name: `${log.user.firstName} ${log.user.lastName}`.trim(),
          avatarUrl: log.user.avatarUrl,
        },
      })),
    };
  }

  async getFilteredTasks(workspaceId: string, filter: DashboardFilter) {
    // Get all projects in the workspace
    const projects = await prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true, key: true },
    });

    const projectIds = projects.map((p: any) => p.id);
    if (projectIds.length === 0) return [];

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build where clause based on filter
    const baseWhere: any = {
      projectId: { in: projectIds },
      deletedAt: null,
    };

    if (filter === 'active' || filter === 'in_progress') {
      baseWhere.status = { category: 'ACTIVE' };
    } else if (filter === 'completed') {
      baseWhere.status = { category: 'DONE' };
    } else if (filter === 'overdue') {
      baseWhere.dueDate = { lt: now };
      baseWhere.status = { category: { notIn: ['DONE', 'CANCELLED'] } };
    } else if (filter === 'due_this_week') {
      baseWhere.dueDate = { gte: now, lte: weekFromNow };
      baseWhere.status = { category: { notIn: ['DONE', 'CANCELLED'] } };
    } else if (filter === 'unassigned') {
      baseWhere.assignees = { none: {} };
    }

    const tasks = await prisma.task.findMany({
      where: baseWhere,
      select: {
        id: true,
        title: true,
        taskNumber: true,
        priority: true,
        dueDate: true,
        projectId: true,
        project: { select: { name: true, key: true } },
        status: { select: { name: true, color: true, category: true } },
        assignees: {
          select: {
            userId: true,
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      taskNumber: t.taskNumber,
      priority: t.priority,
      dueDate: t.dueDate,
      projectId: t.projectId,
      projectName: t.project.name,
      projectKey: t.project.key,
      statusName: t.status.name,
      statusColor: t.status.color,
      statusCategory: t.status.category,
      assignees: (t.assignees || []).map((a: any) => ({
        userId: a.userId,
        name: `${a.user.firstName} ${a.user.lastName}`.trim(),
        avatarUrl: a.user.avatarUrl,
      })),
    }));
  }
}
