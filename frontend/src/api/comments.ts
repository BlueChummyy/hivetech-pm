import { get, post, patch, del } from './client';
import type { Comment } from '@/types/models.types';

export interface CreateCommentData {
  content: string;
}

export interface UpdateCommentData {
  content: string;
}

export const commentsApi = {
  list: (taskId: string) =>
    get<Comment[]>(`/tasks/${taskId}/comments`).then((r) => r.data),

  create: (taskId: string, data: CreateCommentData) =>
    post<Comment>(`/tasks/${taskId}/comments`, data).then((r) => r.data),

  update: (taskId: string, commentId: string, data: UpdateCommentData) =>
    patch<Comment>(`/tasks/${taskId}/comments/${commentId}`, data).then((r) => r.data),

  remove: (taskId: string, commentId: string) =>
    del(`/tasks/${taskId}/comments/${commentId}`),
};
