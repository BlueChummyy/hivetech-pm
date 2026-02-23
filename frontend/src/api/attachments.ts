import { get, post, del } from './client';
import type { Attachment } from '@/types/models.types';

export const attachmentsApi = {
  list: (taskId: string) =>
    get<{ attachments: Attachment[]; pagination: unknown }>(`/attachments`, { params: { taskId } }).then((r) => r.data.attachments),

  upload: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', taskId);
    return post<Attachment>(`/attachments`, formData).then((r) => r.data);
  },

  download: (attachmentId: string) =>
    get<Blob>(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    }),

  remove: (attachmentId: string) =>
    del(`/attachments/${attachmentId}`),
};
