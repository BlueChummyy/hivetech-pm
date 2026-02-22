import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '@/types/models.types';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';

interface CommentSectionProps {
  taskId: string;
  canComment?: boolean;
  isProjectAdmin?: boolean;
}

export function CommentSection({ taskId, canComment = true, isProjectAdmin = false }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const { data: comments, isLoading } = useComments(taskId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const { user } = useAuth();
  const { toast } = useToast();

  function handleSubmit() {
    if (!content.trim()) return;
    createComment.mutate(
      { taskId, data: { content: content.trim() } },
      {
        onSuccess: () => setContent(''),
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to post comment', description: (err as Error).message });
        },
      },
    );
  }

  function handleDelete(commentId: string) {
    deleteComment.mutate(
      { taskId, commentId },
      {
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to delete comment', description: (err as Error).message });
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-surface-300">Comments</h4>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-surface-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-surface-700" />
                <div className="h-3 w-full rounded bg-surface-700" />
              </div>
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {comments.map((comment: Comment) => {
            const isOwnComment = user?.id === comment.authorId;
            const canDelete = isProjectAdmin || isOwnComment;

            return (
              <div key={comment.id} className="group flex gap-3">
                <Avatar src={comment.author?.avatarUrl} name={comment.author?.name || comment.author?.displayName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-surface-200">
                      {comment.author?.name || comment.author?.displayName || 'Unknown'}
                    </span>
                    <span className="text-xs text-surface-500">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        aria-label="Delete comment"
                        className="ml-auto opacity-0 group-hover:opacity-100 rounded p-0.5 text-surface-500 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-surface-300 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-surface-500">No comments yet</p>
      )}

      {canComment ? (
        <div className="flex gap-2 items-start">
          <Avatar src={user?.avatarUrl} name={user?.name} size="md" className="mt-0.5" />
          <div className="flex-1 flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
              placeholder="Write a comment..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || createComment.isPending}
              className="self-end rounded-lg bg-primary-600 p-2 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-surface-500 italic">You do not have permission to comment</p>
      )}
    </div>
  );
}
