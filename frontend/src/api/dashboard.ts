import { get } from './client';

export interface DashboardStats {
  summary: {
    total: number;
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
};
