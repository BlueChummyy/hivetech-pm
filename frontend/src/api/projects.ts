import { get, post, patch, del } from './client';
import type { Project, ProjectMember, ProjectStatus } from '@/types/models.types';

export interface CreateProjectData {
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  spaceId?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
}

export interface CreateStatusData {
  name: string;
  category: string;
  color: string;
  position?: number;
}

export interface UpdateStatusData {
  name?: string;
  category?: string;
  color?: string;
  position?: number;
}

export const projectsApi = {
  list: (workspaceId: string) =>
    get<Project[]>('/projects', { params: { workspaceId } }).then((r) => r.data),

  getById: (id: string) =>
    get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (data: CreateProjectData) =>
    post<Project>('/projects', data).then((r) => r.data),

  update: (id: string, data: UpdateProjectData) =>
    patch<Project>(`/projects/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    del(`/projects/${id}`),

  // Members
  listMembers: (id: string) =>
    get<ProjectMember[]>(`/projects/${id}/members`).then((r) => r.data),

  addMember: (id: string, data: { userId: string; role: string }) =>
    post<ProjectMember>(`/projects/${id}/members`, data).then((r) => r.data),

  updateMember: (id: string, memberId: string, data: { role: string }) =>
    patch<ProjectMember>(`/projects/${id}/members/${memberId}`, data).then((r) => r.data),

  removeMember: (id: string, memberId: string) =>
    del(`/projects/${id}/members/${memberId}`),

  // Statuses
  listStatuses: (id: string) =>
    get<ProjectStatus[]>(`/projects/${id}/statuses`).then((r) => r.data),

  createStatus: (id: string, data: CreateStatusData) =>
    post<ProjectStatus>(`/projects/${id}/statuses`, data).then((r) => r.data),

  updateStatus: (id: string, statusId: string, data: UpdateStatusData) =>
    patch<ProjectStatus>(`/projects/${id}/statuses/${statusId}`, data).then((r) => r.data),

  deleteStatus: (id: string, statusId: string) =>
    del(`/projects/${id}/statuses/${statusId}`),
};
