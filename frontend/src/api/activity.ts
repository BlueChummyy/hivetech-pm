import { get } from './client';
import type { ActivityLog } from '@/types/models.types';

export const activityApi = {
  listByTask: (taskId: string, params?: { page?: number; limit?: number }) =>
    get<ActivityLog[]>(`/tasks/${taskId}/activity`, { params }).then((r) => r.data),
};
