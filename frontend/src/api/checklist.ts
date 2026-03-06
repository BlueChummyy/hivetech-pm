import { get, post, patch, del } from './client';

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isChecked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export const checklistApi = {
  list: (taskId: string) =>
    get<ChecklistItem[]>(`/tasks/${taskId}/checklist`).then((r) => r.data),

  create: (taskId: string, title: string) =>
    post<ChecklistItem>(`/tasks/${taskId}/checklist`, { title }).then((r) => r.data),

  update: (taskId: string, itemId: string, data: { title?: string; isChecked?: boolean }) =>
    patch<ChecklistItem>(`/tasks/${taskId}/checklist/${itemId}`, data).then((r) => r.data),

  remove: (taskId: string, itemId: string) =>
    del(`/tasks/${taskId}/checklist/${itemId}`),

  reorder: (taskId: string, items: { id: string; position: number }[]) =>
    patch<ChecklistItem[]>(`/tasks/${taskId}/checklist/reorder`, { items }).then((r) => r.data),
};
