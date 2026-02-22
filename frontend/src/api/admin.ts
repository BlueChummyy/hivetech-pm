import { get, post, patch, del } from './client';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  workspaceMembers: { role: string; workspace: { id: string; name: string } }[];
  projectMembers: { role: string; project: { id: string; name: string } }[];
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { members: number; projects: number };
  members: { user: { id: string; firstName: string; lastName: string; email: string } }[];
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  workspaceRole?: 'ADMIN' | 'PROJECT_MANAGER' | 'MEMBER' | 'VIEWER';
}

export const adminApi = {
  // Users
  listUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    get<AdminUsersResponse>('/admin/users', { params }).then((r) => r.data),

  createUser: (data: CreateUserData) =>
    post<AdminUser>('/admin/users', data).then((r) => r.data),

  resetPassword: (userId: string, newPassword: string) =>
    post<{ message: string }>(`/admin/users/${userId}/reset-password`, { newPassword }).then((r) => r.data),

  updateRole: (userId: string, workspaceId: string, role: string) =>
    patch<any>(`/admin/users/${userId}/role`, { workspaceId, role }).then((r) => r.data),

  deleteUser: (userId: string) =>
    del<{ message: string }>(`/admin/users/${userId}`).then((r) => r.data),

  deactivateUser: (userId: string) =>
    patch<{ message: string; isActive: boolean }>(`/admin/users/${userId}/deactivate`).then((r) => r.data),

  // Workspaces
  listWorkspaces: () =>
    get<AdminWorkspace[]>('/admin/workspaces').then((r) => r.data),

  deleteWorkspace: (workspaceId: string) =>
    del<{ message: string }>(`/admin/workspaces/${workspaceId}`).then((r) => r.data),
};
