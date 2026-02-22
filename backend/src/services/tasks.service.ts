import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { emitToProject, emitToUser } from '../utils/socket.js';
import { logAudit } from './audit.service.js';

export class TasksService {
  async create(data: {
    projectId: string;
    title: string;
    description?: string;
    statusId: string;
    assigneeId?: string;
    reporterId: string;
    parentId?: string;
    priority?: string;
    startDate?: Date;
    dueDate?: Date;
    estimatedHours?: number;
  }) {
    // Verify statusId belongs to the same project
    const status = await prisma.projectStatus.findFirst({
      where: { id: data.statusId, projectId: data.projectId },
    });
    if (!status) throw ApiError.badRequest('Status does not belong to this project');

    // If parentId provided, verify parent task is in same project and not deleted
    if (data.parentId) {
      const parent = await prisma.task.findFirst({
        where: { id: data.parentId, projectId: data.projectId, deletedAt: null },
      });
      if (!parent) throw ApiError.badRequest('Parent task not found in this project');
    }

    // Atomically increment taskCounter and create task in transaction
    const task = await prisma.$transaction(async (tx: any) => {
      const project = await tx.project.update({
        where: { id: data.projectId },
        data: { taskCounter: { increment: 1 } },
      });

      // Calculate position: max position in same status + 1000
      const lastTask = await tx.task.findFirst({
        where: { projectId: data.projectId, statusId: data.statusId, deletedAt: null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = (lastTask?.position ?? 0) + 1000;

      return tx.task.create({
        data: {
          projectId: data.projectId,
          statusId: data.statusId,
          assigneeId: data.assigneeId,
          reporterId: data.reporterId,
          parentId: data.parentId,
          taskNumber: project.taskCounter,
          title: data.title,
          description: data.description,
          priority: (data.priority as any) || 'NONE',
          position,
          startDate: data.startDate,
          dueDate: data.dueDate,
          estimatedHours: data.estimatedHours,
        },
        include: {
          status: true,
          assignee: true,
          reporter: true,
          labels: { include: { label: true } },
        },
      });
    });

    emitToProject(task.projectId, 'task:created', task);

    // Audit log
    const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
    if (project) {
      logAudit({ workspaceId: project.workspaceId, userId: data.reporterId, action: 'created', entityType: 'task', entityId: task.id, metadata: { title: task.title, taskNumber: task.taskNumber } });
    }

    // Notify assignee about task assignment
    if (task.assigneeId && task.assigneeId !== data.reporterId) {
      const notification = await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'Task assigned to you',
          message: `You've been assigned to "${task.title}"`,
          resourceType: 'task',
          resourceId: task.id,
        },
      });
      emitToUser(task.assigneeId, 'notification:new', notification);
    }

    return task;
  }

  async list(filters: {
    projectId?: string;
    statusId?: string;
    assigneeId?: string;
    priority?: string;
    parentId?: string | null;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.parentId !== undefined) where.parentId = filters.parentId;
    if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { position: 'asc' },
        include: {
          status: true,
          assignee: true,
          labels: { include: { label: true } },
          _count: { select: { subtasks: { where: { deletedAt: null } }, comments: { where: { deletedAt: null } }, attachments: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async listMyTasks(userId: string) {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: userId, deletedAt: null },
      orderBy: [{ dueDate: 'asc' }, { position: 'asc' }],
      include: {
        status: true,
        assignee: true,
        project: { select: { id: true, key: true, name: true, workspaceId: true } },
        labels: { include: { label: true } },
        _count: { select: { subtasks: { where: { deletedAt: null } }, comments: { where: { deletedAt: null } }, attachments: true } },
      },
    });
    return tasks;
  }

  async getById(id: string) {
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        status: true,
        assignee: true,
        reporter: true,
        parent: { select: { id: true, title: true, taskNumber: true } },
        subtasks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: {
            status: true,
            assignee: true,
          },
        },
        labels: { include: { label: true } },
        dependencies: {
          include: {
            dependsOnTask: { select: { id: true, title: true, taskNumber: true, status: true } },
          },
        },
        dependedOnBy: {
          include: {
            task: { select: { id: true, title: true, taskNumber: true, status: true } },
          },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: true,
          },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
        project: { select: { id: true, key: true, name: true, workspaceId: true } },
      },
    });
    if (!task) throw ApiError.notFound('Task not found');
    return task;
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    statusId?: string;
    assigneeId?: string | null;
    priority?: string;
    position?: number;
    startDate?: Date | null;
    dueDate?: Date | null;
    estimatedHours?: number | null;
  }, updatedByUserId?: string) {
    // Fetch existing task to get projectId
    const existing = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw ApiError.notFound('Task not found');

    // If statusId is changing, verify new status belongs to same project
    if (data.statusId && data.statusId !== existing.statusId) {
      const status = await prisma.projectStatus.findFirst({
        where: { id: data.statusId, projectId: existing.projectId },
      });
      if (!status) throw ApiError.badRequest('Status does not belong to this project');
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.statusId !== undefined && { statusId: data.statusId }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.priority !== undefined && { priority: data.priority as any }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
      },
      include: {
        status: true,
        assignee: true,
        reporter: true,
        labels: { include: { label: true } },
      },
    });

    emitToProject(task.projectId, 'task:updated', task);

    // Audit log
    const proj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
    if (proj && updatedByUserId) {
      const changes: Record<string, unknown> = {};
      if (data.title !== undefined && data.title !== existing.title) changes.title = { from: existing.title, to: data.title };
      if (data.statusId !== undefined && data.statusId !== existing.statusId) changes.statusId = { from: existing.statusId, to: data.statusId };
      if (data.priority !== undefined && data.priority !== existing.priority) changes.priority = { from: existing.priority, to: data.priority };
      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) changes.assigneeId = { from: existing.assigneeId, to: data.assigneeId };
      if (data.startDate !== undefined) changes.startDate = { to: data.startDate };
      if (data.dueDate !== undefined) changes.dueDate = { to: data.dueDate };
      logAudit({ workspaceId: proj.workspaceId, userId: updatedByUserId, action: 'updated', entityType: 'task', entityId: task.id, metadata: { title: task.title, changes } });
    }

    // Notify new assignee about task assignment (if assignee changed and not self-assigning)
    if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== updatedByUserId) {
      const notification = await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'Task assigned to you',
          message: `You've been assigned to "${task.title}"`,
          resourceType: 'task',
          resourceId: task.id,
        },
      });
      emitToUser(data.assigneeId, 'notification:new', notification);
    }

    return task;
  }

  async softDelete(id: string, deletedByUserId?: string) {
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, projectId: true, title: true, taskNumber: true },
    });
    if (!task) throw ApiError.notFound('Task not found');

    const now = new Date();

    // Soft-delete the task and all its non-deleted subtasks in a transaction
    await prisma.$transaction(async (tx: any) => {
      await tx.task.update({
        where: { id },
        data: { deletedAt: now },
      });
      await tx.task.updateMany({
        where: { parentId: id, deletedAt: null },
        data: { deletedAt: now },
      });
    });

    emitToProject(task.projectId, 'task:deleted', { id: task.id });

    // Audit log
    if (deletedByUserId) {
      const proj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } });
      if (proj) {
        logAudit({ workspaceId: proj.workspaceId, userId: deletedByUserId, action: 'deleted', entityType: 'task', entityId: task.id, metadata: { title: task.title, taskNumber: task.taskNumber } });
      }
    }

    return task;
  }

  async addDependency(taskId: string, dependsOnTaskId: string, type: string = 'FINISH_TO_START') {
    // Check for self-dependency
    if (taskId === dependsOnTaskId) {
      throw ApiError.badRequest('A task cannot depend on itself');
    }

    // Verify both tasks exist and are in the same project
    const [task, dependsOn] = await Promise.all([
      prisma.task.findFirst({ where: { id: taskId, deletedAt: null } }),
      prisma.task.findFirst({ where: { id: dependsOnTaskId, deletedAt: null } }),
    ]);
    if (!task) throw ApiError.notFound('Task not found');
    if (!dependsOn) throw ApiError.notFound('Dependency task not found');
    if (task.projectId !== dependsOn.projectId) {
      throw ApiError.badRequest('Both tasks must be in the same project');
    }

    // Check for circular dependency by walking the dependency chain
    // If dependsOnTaskId transitively depends on taskId, adding this edge creates a cycle
    const visited = new Set<string>();
    const queue = [taskId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === dependsOnTaskId) {
        throw ApiError.badRequest('Circular dependency detected');
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const deps = await prisma.taskDependency.findMany({
        where: { dependsOnTaskId: current },
        select: { taskId: true },
      });
      for (const dep of deps) {
        if (!visited.has(dep.taskId)) {
          queue.push(dep.taskId);
        }
      }
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
        type: type as any,
      },
      include: {
        dependsOnTask: { select: { id: true, title: true, taskNumber: true, status: true } },
      },
    });

    return dependency;
  }

  async removeDependency(dependencyId: string) {
    const dependency = await prisma.taskDependency.findUnique({ where: { id: dependencyId } });
    if (!dependency) throw ApiError.notFound('Dependency not found');
    return prisma.taskDependency.delete({ where: { id: dependencyId } });
  }

  async updatePosition(id: string, position: number, statusId?: string) {
    const existing = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw ApiError.notFound('Task not found');

    // If statusId is changing, verify it belongs to the same project
    if (statusId && statusId !== existing.statusId) {
      const status = await prisma.projectStatus.findFirst({
        where: { id: statusId, projectId: existing.projectId },
      });
      if (!status) throw ApiError.badRequest('Status does not belong to this project');
    }

    const data: any = { position };
    if (statusId) data.statusId = statusId;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: { status: true },
    });

    emitToProject(task.projectId, 'task:updated', task);

    return task;
  }
}
