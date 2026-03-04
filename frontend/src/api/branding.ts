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
  get: (workspaceId: string) =>
    get<Branding | null>(`/workspaces/${workspaceId}/branding`).then((r) => r.data),

  upsert: (workspaceId: string, data: UpdateBrandingData) =>
    put<Branding>(`/workspaces/${workspaceId}/branding`, data).then((r) => r.data),

  uploadLogo: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post<Branding>(`/workspaces/${workspaceId}/branding/logo`, formData).then((r) => r.data);
  },

  uploadFavicon: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post<Branding>(`/workspaces/${workspaceId}/branding/favicon`, formData).then((r) => r.data);
  },
};
