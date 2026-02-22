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
    get<Comment[]>('/comments', { params: { taskId } }).then((r) => r.data),

  create: (taskId: string, data: CreateCommentData) =>
    post<Comment>('/comments', { ...data, taskId }).then((r) => r.data),

  update: (_taskId: string, commentId: string, data: UpdateCommentData) =>
    patch<Comment>(`/comments/${commentId}`, data).then((r) => r.data),

  remove: (_taskId: string, commentId: string) =>
    del(`/comments/${commentId}`),
};
