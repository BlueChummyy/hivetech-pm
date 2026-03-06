import { get } from './client';

export interface SearchFilters {
  statusCategory?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
}

export interface SearchResults {
  tasks: {
    id: string;
    title: string;
    taskNumber: number;
    priority: string;
    projectId: string;
    projectName: string;
    projectKey: string;
    statusName: string;
    statusColor: string;
  }[];
  projects: {
    id: string;
    name: string;
    key: string;
    description: string | null;
  }[];
  people: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  }[];
}

export const searchApi = {
  search: (q: string, workspaceId: string, filters?: SearchFilters) => {
    const params: Record<string, string> = { q, workspaceId };
    if (filters?.statusCategory) params.statusCategory = filters.statusCategory;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.assigneeId) params.assigneeId = filters.assigneeId;
    if (filters?.projectId) params.projectId = filters.projectId;
    return get<SearchResults>(`/search`, { params }).then((r) => r.data);
  },
};
