import { get, patch } from './client';
import type { Notification } from '@/types/models.types';

export const notificationsApi = {
  list: () =>
    get<Notification[]>('/notifications').then((r) => r.data),

  markAsRead: (id: string) =>
    patch<Notification>(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    patch('/notifications/read-all').then((r) => r.data),
};
