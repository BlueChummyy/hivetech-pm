import { post, get } from './client';
import type { AuthResponse } from '@/types/api.types';
import type { User } from '@/types/models.types';

export const setupApi = {
  getStatus: () =>
    get<{ needsSetup: boolean; registrationDisabled: boolean }>('/setup/status').then((r) => r.data),

  complete: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    post<AuthResponse>('/setup/complete', data),
};

export const authApi = {
  login: (data: { email: string; password: string }) =>
    post<AuthResponse>('/auth/login', data),

  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    post<AuthResponse>('/auth/register', data),

  refresh: (data: { refreshToken: string }) =>
    post<{ accessToken: string; refreshToken: string }>('/auth/refresh', data),

  logout: () => post('/auth/logout'),

  me: () => get<User>('/auth/me'),

  getSsoProviders: () =>
    get<string[]>('/auth/providers').then((r) => r.data),
};
