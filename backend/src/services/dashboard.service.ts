import { prisma } from '../prisma/client.js';

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
          total: 0,
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

    // By assignee
    const assigneeCounts: Map<string, { name: string; avatarUrl: string | null; count: number }> = new Map();

    // Project progress
    const projectTaskCounts: Map<string, { total: number; done: number }> = new Map();
    for (const p of projects) {
      projectTaskCounts.set(p.id, { total: 0, done: 0 });
    }

    for (const task of tasks) {
      const category = task.status?.category || 'NOT_STARTED';

      // Status counts
      if (statusCounts[category] !== undefined) {
        statusCounts[category]++;
      }

      // Priority counts
      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority]++;
      }

      // Summary
      if (category === 'DONE') completed++;
      if (category === 'ACTIVE') inProgress++;

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

      // Assignee tracking - use the assignees junction table
      const taskAssignees = task.assignees || [];
      if (taskAssignees.length === 0) {
        unassigned++;
        // Track unassigned
        const existing = assigneeCounts.get('unassigned');
        if (existing) {
          existing.count++;
        } else {
          assigneeCounts.set('unassigned', { name: 'Unassigned', avatarUrl: null, count: 1 });
        }
      } else {
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

      // Project progress
      const pc = projectTaskCounts.get(task.projectId);
      if (pc) {
        pc.total++;
        if (category === 'DONE') pc.done++;
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

    // Build projectProgress array
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
        total: tasks.length,
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
}
