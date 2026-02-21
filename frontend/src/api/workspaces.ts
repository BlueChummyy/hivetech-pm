import { get, post, patch, del } from './client';
import type { Workspace, WorkspaceMember } from '@/types/models.types';
import type { PaginatedResponse } from '@/types/api.types';

export interface CreateWorkspaceData {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
}

export interface AddMemberData {
  userId: string;
  role: string;
}

export const workspacesApi = {
  list: () =>
    get<Workspace[]>('/workspaces').then((r) => r.data),

  getById: (id: string) =>
    get<Workspace>(`/workspaces/${id}`).then((r) => r.data),

  create: (data: CreateWorkspaceData) =>
    post<Workspace>('/workspaces', data).then((r) => r.data),

  update: (id: string, data: UpdateWorkspaceData) =>
    patch<Workspace>(`/workspaces/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    del(`/workspaces/${id}`),

  listMembers: (id: string) =>
    get<WorkspaceMember[]>(`/workspaces/${id}/members`).then((r) => r.data),

  addMember: (id: string, data: AddMemberData) =>
    post<WorkspaceMember>(`/workspaces/${id}/members`, data).then((r) => r.data),

  updateMember: (id: string, memberId: string, data: { role: string }) =>
    patch<WorkspaceMember>(`/workspaces/${id}/members/${memberId}`, data).then((r) => r.data),

  removeMember: (id: string, memberId: string) =>
    del(`/workspaces/${id}/members/${memberId}`),
};
