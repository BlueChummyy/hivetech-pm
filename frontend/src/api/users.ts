import { get, patch, post } from './client';
import type { User } from '@/types/models.types';

export interface UpdateProfileData {
  name?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const usersApi = {
  getMe: () =>
    get<User>('/auth/me').then((r) => r.data),

  updateMe: (data: UpdateProfileData) =>
    patch<User>('/users/me', data).then((r) => r.data),

  changePassword: (data: ChangePasswordData) =>
    post('/users/me/password', data).then((r) => r.data),

  list: (params?: { search?: string }) => {
    const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    return get<User[]>(`/users${query}`).then((r) => r.data);
  },
};
