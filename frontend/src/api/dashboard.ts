import { get } from './client';

export type DashboardFilter =
  | 'active'
  | 'completed'
  | 'in_progress'
  | 'overdue'
  | 'due_this_week'
  | 'unassigned';

export interface DashboardTask {
  id: string;
  title: string;
  taskNumber: number;
  priority: string;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  projectKey: string;
  statusName: string;
  statusColor: string;
  statusCategory: string;
  assignees: {
    userId: string;
    name: string;
    avatarUrl: string | null;
  }[];
}

export interface DashboardStats {
  summary: {
    active: number;
    completed: number;
    inProgress: number;
    overdue: number;
    dueThisWeek: number;
    unassigned: number;
  };
  byStatus: {
    category: string;
    count: number;
  }[];
  byPriority: {
    priority: string;
    count: number;
  }[];
  byAssignee: {
    userId: string | null;
    name: string;
    avatarUrl: string | null;
    count: number;
  }[];
  projectProgress: {
    projectId: string;
    name: string;
    key: string;
    total: number;
    done: number;
    percentage: number;
  }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  }[];
}

export const dashboardApi = {
  getStats: (workspaceId: string) =>
    get<DashboardStats>(`/dashboard/${workspaceId}/stats`).then((r) => r.data),

  getFilteredTasks: (workspaceId: string, filter: DashboardFilter) =>
    get<DashboardTask[]>(`/dashboard/${workspaceId}/tasks`, { params: { filter } }).then((r) => r.data),
};
