import { get } from './client';

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
  search: (q: string, workspaceId: string) =>
    get<SearchResults>(`/search`, { params: { q, workspaceId } }).then((r) => r.data),
};
