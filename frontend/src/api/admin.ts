import { get, post, patch } from './client';

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

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  workspaceRole?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export const adminApi = {
  listUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    get<AdminUsersResponse>('/admin/users', { params }).then((r) => r.data),

  createUser: (data: CreateUserData) =>
    post<AdminUser>('/admin/users', data).then((r) => r.data),

  resetPassword: (userId: string, newPassword: string) =>
    post<{ message: string }>(`/admin/users/${userId}/reset-password`, { newPassword }).then((r) => r.data),

  updateRole: (userId: string, workspaceId: string, role: string) =>
    patch<any>(`/admin/users/${userId}/role`, { workspaceId, role }).then((r) => r.data),
};
