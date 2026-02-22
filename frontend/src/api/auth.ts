import { post, get } from './client';
import type { AuthResponse } from '@/types/api.types';
import type { User } from '@/types/models.types';

export const authApi = {
  login: (data: { email: string; password: string }) =>
    post<AuthResponse>('/auth/login', data),

  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    post<AuthResponse>('/auth/register', data),

  refresh: (data: { refreshToken: string }) =>
    post<{ accessToken: string; refreshToken: string }>('/auth/refresh', data),

  logout: () => post('/auth/logout'),

  me: () => get<User>('/auth/me'),
};
