import { get, post, del } from './client';
import type { Attachment } from '@/types/models.types';

export const attachmentsApi = {
  list: (taskId: string) =>
    get<Attachment[]>(`/tasks/${taskId}/attachments`).then((r) => r.data),

  upload: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post<Attachment>(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  download: (taskId: string, attachmentId: string) =>
    get<Blob>(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    }),

  remove: (taskId: string, attachmentId: string) =>
    del(`/tasks/${taskId}/attachments/${attachmentId}`),
};
