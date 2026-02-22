import { get, post, patch, del } from './client';
import type { Space } from '@/types/models.types';

export interface CreateSpaceData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateSpaceData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export const spacesApi = {
  list: (workspaceId: string) =>
    get<Space[]>(`/workspaces/${workspaceId}/spaces`).then((r) => r.data),

  getById: (workspaceId: string, id: string) =>
    get<Space>(`/workspaces/${workspaceId}/spaces/${id}`).then((r) => r.data),

  create: (workspaceId: string, data: CreateSpaceData) =>
    post<Space>(`/workspaces/${workspaceId}/spaces`, data).then((r) => r.data),

  update: (workspaceId: string, id: string, data: UpdateSpaceData) =>
    patch<Space>(`/workspaces/${workspaceId}/spaces/${id}`, data).then((r) => r.data),

  remove: (workspaceId: string, id: string) =>
    del(`/workspaces/${workspaceId}/spaces/${id}`),
};
