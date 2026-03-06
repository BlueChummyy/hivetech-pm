import { get, post } from './client';

export interface ActiveTimer {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  task?: {
    id: string;
    title: string;
    taskNumber: number;
    projectId: string;
  };
}

export interface StopTimerResult {
  entry: unknown | null;
  hours: number;
}

export const timerApi = {
  start: (taskId: string) =>
    post<ActiveTimer>(`/tasks/${taskId}/timer/start`).then((r) => r.data),

  stop: (taskId: string) =>
    post<StopTimerResult>(`/tasks/${taskId}/timer/stop`).then((r) => r.data),

  getActive: () =>
    get<ActiveTimer | null>('/timer/active').then((r) => r.data),
};
