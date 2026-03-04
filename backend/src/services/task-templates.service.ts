import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';

export class TaskTemplatesService {
  async create(data: {
    projectId: string;
    createdById: string;
    name: string;
    description?: string;
    priority?: string;
    subtaskTemplates?: { title: string; priority?: string }[];
  }) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, deletedAt: null },
    });
    if (!project) throw ApiError.notFound('Project not found');

    const template = await prisma.taskTemplate.create({
      data: {
        projectId: data.projectId,
        createdById: data.createdById,
        name: data.name,
        description: data.description,
        priority: (data.priority as any) || 'NONE',
        subtaskTemplates: data.subtaskTemplates ?? undefined,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    return template;
  }

  async list(projectId: string) {
    const templates = await prisma.taskTemplate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });
    return templates;
  }

  async getById(id: string) {
    const template = await prisma.taskTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });
    if (!template) throw ApiError.notFound('Task template not found');
    return template;
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    priority?: string;
    subtaskTemplates?: { title: string; priority?: string }[];
  }) {
    const existing = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Task template not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority as any;
    if (data.subtaskTemplates !== undefined) updateData.subtaskTemplates = data.subtaskTemplates;

    const template = await prisma.taskTemplate.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    return template;
  }

  async delete(id: string) {
    const existing = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Task template not found');

    await prisma.taskTemplate.delete({ where: { id } });
    return { id };
  }

  async createTaskFromTemplate(templateId: string, data: {
    projectId: string;
    statusId: string;
    title: string;
    reporterId: string;
    description?: string;
  }) {
    const template = await prisma.taskTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw ApiError.notFound('Task template not found');

    // Verify statusId belongs to project
    const status = await prisma.projectStatus.findFirst({
      where: { id: data.statusId, projectId: data.projectId },
    });
    if (!status) throw ApiError.badRequest('Status does not belong to this project');

    const subtaskTemplates = (template.subtaskTemplates as any[]) || [];

    const task = await prisma.$transaction(async (tx: any) => {
      // Increment task counter for main task + subtasks
      const project = await tx.project.update({
        where: { id: data.projectId },
        data: { taskCounter: { increment: 1 + subtaskTemplates.length } },
      });

      // Calculate position
      const lastTask = await tx.task.findFirst({
        where: { projectId: data.projectId, statusId: data.statusId, deletedAt: null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = (lastTask?.position ?? 0) + 1000;

      // Create main task
      const mainTaskNumber = project.taskCounter - subtaskTemplates.length;
      const created = await tx.task.create({
        data: {
          projectId: data.projectId,
          statusId: data.statusId,
          reporterId: data.reporterId,
          taskNumber: mainTaskNumber,
          title: data.title,
          description: data.description || template.description || undefined,
          priority: template.priority,
          position,
        },
        include: {
          status: true,
          assignee: true,
          reporter: true,
          labels: { include: { label: true } },
        },
      });

      // Create subtasks from template
      for (let i = 0; i < subtaskTemplates.length; i++) {
        const sub = subtaskTemplates[i];
        await tx.task.create({
          data: {
            projectId: data.projectId,
            statusId: data.statusId,
            reporterId: data.reporterId,
            parentId: created.id,
            taskNumber: mainTaskNumber + 1 + i,
            title: sub.title,
            priority: (sub.priority as any) || 'NONE',
            position: (i + 1) * 1000,
          },
        });
      }

      return created;
    });

    // Re-fetch with full includes
    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        status: true,
        assignee: true,
        reporter: true,
        labels: { include: { label: true } },
        assignees: { include: { user: true } },
        subtasks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: { status: true },
        },
      },
    });

    return fullTask || task;
  }
}
