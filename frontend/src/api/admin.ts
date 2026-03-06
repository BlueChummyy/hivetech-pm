import { get, post, put, patch, del } from './client';

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

export interface AdminSpace {
  id: string;
  name: string;
  color: string | null;
  position: number;
  workspaceId: string;
  workspace: { id: string; name: string };
  projects: { id: string; name: string; key: string }[];
  _count: { projects: number };
}

export interface AdminProject {
  id: string;
  name: string;
  key: string;
  description: string | null;
  workspaceId: string;
  spaceId: string | null;
  workspace: { id: string; name: string };
  space: { id: string; name: string } | null;
  _count: { tasks: number; members: number };
}

export interface SmtpSettingsData {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface SmtpSettingsResponse {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface OAuthProviderConfig {
  id: string;
  provider: 'GOOGLE' | 'MICROSOFT' | 'OIDC';
  clientId: string;
  clientSecret: string;
  tenantId: string | null;
  issuerUrl: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAuthProviderData {
  provider: 'GOOGLE' | 'MICROSOFT' | 'OIDC';
  clientId: string;
  clientSecret: string;
  tenantId?: string | null;
  issuerUrl?: string | null;
  enabled: boolean;
}

export interface AppSettings {
  hidePublicRegistration: boolean;
}

export const adminApi = {
  // App settings
  getAppSettings: () =>
    get<AppSettings>('/admin/settings/app').then((r) => r.data),

  updateAppSettings: (data: Partial<AppSettings>) =>
    put<{ message: string }>('/admin/settings/app', data).then((r) => r.data),

  // Users
  listUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    get<AdminUsersResponse>('/admin/users', { params }).then((r) => r.data),

  createUser: (data: CreateUserData) =>
    post<AdminUser>('/admin/users', data).then((r) => r.data),

  updateUser: (userId: string, data: { firstName?: string; lastName?: string; email?: string; isActive?: boolean }) =>
    patch<AdminUser>(`/admin/users/${userId}`, data).then((r) => r.data),

  resetPassword: (userId: string, newPassword: string) =>
    post<{ message: string }>(`/admin/users/${userId}/reset-password`, { newPassword }).then((r) => r.data),

  updateRole: (userId: string, workspaceId: string, role: string) =>
    patch<any>(`/admin/users/${userId}/role`, { workspaceId, role }).then((r) => r.data),

  deleteUser: (userId: string) =>
    del<{ message: string }>(`/admin/users/${userId}`).then((r) => r.data),

  deactivateUser: (userId: string) =>
    patch<{ message: string; isActive: boolean }>(`/admin/users/${userId}/deactivate`).then((r) => r.data),

  assignWorkspace: (userId: string, workspaceId: string, role: string) =>
    post<any>(`/admin/users/${userId}/assign-workspace`, { workspaceId, role }).then((r) => r.data),

  removeWorkspace: (userId: string, workspaceId: string) =>
    post<{ message: string }>(`/admin/users/${userId}/remove-workspace`, { workspaceId }).then((r) => r.data),

  // Workspaces
  listWorkspaces: () =>
    get<AdminWorkspace[]>('/admin/workspaces').then((r) => r.data),

  deleteWorkspace: (workspaceId: string) =>
    del<{ message: string }>(`/admin/workspaces/${workspaceId}`).then((r) => r.data),

  // Spaces
  listSpaces: () =>
    get<AdminSpace[]>('/admin/spaces').then((r) => r.data),

  // Projects
  listProjects: () =>
    get<AdminProject[]>('/admin/projects').then((r) => r.data),

  assignProjectSpace: (projectId: string, spaceId: string | null) =>
    patch<any>(`/admin/projects/${projectId}/space`, { spaceId }).then((r) => r.data),

  // Deleted users
  listDeletedUsers: (params?: { workspaceId?: string }) =>
    get<AdminUser[]>('/admin/users/deleted', { params }).then((r) => r.data),

  restoreUser: (userId: string) =>
    post<AdminUser>(`/admin/users/${userId}/restore`).then((r) => r.data),

  hardDeleteUser: (userId: string) =>
    del<{ message: string }>(`/admin/users/${userId}/hard-delete`).then((r) => r.data),

  // Deleted tasks
  listDeletedTasks: (params?: { workspaceId?: string }) =>
    get<any[]>('/admin/tasks/deleted', { params }).then((r) => r.data),

  restoreTask: (taskId: string) =>
    post<{ message: string }>(`/admin/tasks/${taskId}/restore`).then((r) => r.data),

  hardDeleteTask: (taskId: string) =>
    del<{ message: string }>(`/admin/tasks/${taskId}/hard-delete`).then((r) => r.data),

  // Deleted projects
  listDeletedProjects: (params?: { workspaceId?: string }) =>
    get<any[]>('/admin/projects/deleted', { params }).then((r) => r.data),

  restoreProject: (projectId: string) =>
    post<{ message: string }>(`/admin/projects/${projectId}/restore`).then((r) => r.data),

  hardDeleteProject: (projectId: string) =>
    del<{ message: string }>(`/admin/projects/${projectId}/hard-delete`).then((r) => r.data),

  // Deleted spaces
  listDeletedSpaces: (params?: { workspaceId?: string }) =>
    get<any[]>('/admin/spaces/deleted', { params }).then((r) => r.data),

  restoreSpace: (spaceId: string) =>
    post<{ message: string }>(`/admin/spaces/${spaceId}/restore`).then((r) => r.data),

  hardDeleteSpace: (spaceId: string) =>
    del<{ message: string }>(`/admin/spaces/${spaceId}/hard-delete`).then((r) => r.data),

  // Audit log
  listAuditLogs: (params?: { page?: number; limit?: number; entityType?: string; action?: string; workspaceId?: string }) =>
    get<{ logs: any[]; pagination: any }>('/admin/audit-log', { params }).then((r) => r.data),

  // SMTP settings
  getSmtpSettings: () =>
    get<{ configured: boolean; settings: SmtpSettingsResponse | null }>('/admin/settings/smtp').then((r) => r.data),

  updateSmtpSettings: (data: SmtpSettingsData) =>
    put<{ message: string }>('/admin/settings/smtp', data).then((r) => r.data),

  testSmtpConnection: () =>
    post<{ message: string }>('/admin/settings/smtp/test').then((r) => r.data),

  // OAuth/SSO providers
  listAuthProviders: () =>
    get<OAuthProviderConfig[]>('/admin/auth-providers').then((r) => r.data),

  upsertAuthProvider: (data: UpsertAuthProviderData) =>
    put<OAuthProviderConfig>('/admin/auth-providers', data).then((r) => r.data),

  deleteAuthProvider: (provider: string) =>
    del<{ message: string }>(`/admin/auth-providers/${provider}`).then((r) => r.data),
};
