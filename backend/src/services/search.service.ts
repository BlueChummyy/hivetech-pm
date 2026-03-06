import { prisma } from '../prisma/client.js';

export interface SearchFilters {
  statusCategory?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
}

export interface SearchResults {
  tasks: {
    id: string;
    title: string;
    taskNumber: number;
    priority: string;
    projectId: string;
    projectName: string;
    projectKey: string;
    statusName: string;
    statusColor: string;
  }[];
  projects: {
    id: string;
    name: string;
    key: string;
    description: string | null;
  }[];
  people: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  }[];
}

export class SearchService {
  async search(query: string, workspaceId: string, userId: string, filters?: SearchFilters): Promise<SearchResults> {
    const term = query.trim();
    if (!term) {
      return { tasks: [], projects: [], people: [] };
    }

    // Get projects the user has access to in this workspace
    const projectWhere: any = {
      workspaceId,
      deletedAt: null,
      members: { some: { userId } },
    };
    // If filtering by project, only search within that project
    if (filters?.projectId) {
      projectWhere.id = filters.projectId;
    }

    const accessibleProjects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true },
    });
    const projectIds = accessibleProjects.map((p: { id: string }) => p.id);

    // Build additional task filters
    const taskFilterWhere: any = {};
    if (filters?.statusCategory) {
      taskFilterWhere.status = { category: filters.statusCategory };
    }
    if (filters?.priority) {
      taskFilterWhere.priority = filters.priority;
    }
    if (filters?.assigneeId) {
      taskFilterWhere.assignees = { some: { userId: filters.assigneeId } };
    }

    // Run all three searches in parallel
    const [tasks, projects, people] = await Promise.all([
      // Search tasks
      projectIds.length > 0
        ? prisma.task.findMany({
            where: {
              projectId: { in: projectIds },
              deletedAt: null,
              closedAt: null,
              ...taskFilterWhere,
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              title: true,
              taskNumber: true,
              priority: true,
              projectId: true,
              project: { select: { name: true, key: true } },
              status: { select: { name: true, color: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),

      // Search projects (not affected by task filters)
      prisma.project.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          members: { some: { userId } },
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { key: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          key: true,
          description: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Search people in workspace
      prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          workspaceMembers: { some: { workspaceId } },
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
        orderBy: { firstName: 'asc' },
        take: 5,
      }),
    ]);

    return {
      tasks: tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        taskNumber: t.taskNumber,
        priority: t.priority,
        projectId: t.projectId,
        projectName: t.project.name,
        projectKey: t.project.key,
        statusName: t.status.name,
        statusColor: t.status.color,
      })),
      projects,
      people,
    };
  }
}
