import { get, put, post } from './client';

export interface Branding {
  id: string;
  workspaceId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  orgName: string | null;
  primaryColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBrandingData {
  orgName?: string;
  primaryColor?: string;
}

export const brandingApi = {
  get: () =>
    get<Branding | null>('/admin/branding').then((r) => r.data),

  upsert: (data: UpdateBrandingData) =>
    put<Branding>('/admin/branding', data).then((r) => r.data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post<Branding>('/admin/branding/logo', formData).then((r) => r.data);
  },

  uploadFavicon: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post<Branding>('/admin/branding/favicon', formData).then((r) => r.data);
  },
};
