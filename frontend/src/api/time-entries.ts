import { get, post, put, del } from './client';
import type { TimeEntry } from '@/types/models.types';

export interface CreateTimeEntryData {
  hours: number;
  description?: string;
  date: string;
}

export interface UpdateTimeEntryData {
  hours?: number;
  description?: string;
  date?: string;
}

export interface TimeEntriesResponse {
  entries: TimeEntry[];
  totalHours: number;
}

export const timeEntriesApi = {
  list: (taskId: string) =>
    get<TimeEntriesResponse>(`/tasks/${taskId}/time-entries`).then((r) => r.data),

  create: (taskId: string, data: CreateTimeEntryData) =>
    post<TimeEntry>(`/tasks/${taskId}/time-entries`, data).then((r) => r.data),

  update: (entryId: string, data: UpdateTimeEntryData) =>
    put<TimeEntry>(`/time-entries/${entryId}`, data).then((r) => r.data),

  remove: (entryId: string) =>
    del(`/time-entries/${entryId}`),
};
