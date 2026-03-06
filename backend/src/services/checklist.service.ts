import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';

export class ChecklistService {
  async create(data: { taskId: string; title: string }) {
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

    return prisma.checklistItem.create({
      data: {
        taskId: data.taskId,
        title: data.title,
        position,
      },
    });
  }

  async list(taskId: string) {
    return prisma.checklistItem.findMany({
      where: { taskId },
      orderBy: { position: 'asc' },
    });
  }

  async update(id: string, data: { title?: string; isChecked?: boolean }) {
    const item = await prisma.checklistItem.findUnique({ where: { id } });
    if (!item) throw ApiError.notFound('Checklist item not found');

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.isChecked !== undefined) updateData.isChecked = data.isChecked;

    return prisma.checklistItem.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    const item = await prisma.checklistItem.findUnique({ where: { id } });
    if (!item) throw ApiError.notFound('Checklist item not found');

    await prisma.checklistItem.delete({ where: { id } });
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
