import { useState, useCallback, useRef } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '@/types/models.types';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { RichTextDisplay } from '@/components/ui/RichTextDisplay';

interface CommentSectionProps {
  taskId: string;
  canComment?: boolean;
  isProjectAdmin?: boolean;
}

/** Check if HTML content is effectively empty (just empty paragraphs) */
function isContentEmpty(html: string): boolean {
  if (!html) return true;
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return stripped.length === 0;
}

/**
 * Convert TipTap mention spans to the legacy @[Name](userId) format for backend storage.
 * This ensures the backend mention parsing/notifications still work.
 */
function convertMentionSpansToLegacy(html: string): string {
  // TipTap mention extension produces: <span data-type="mention" data-id="userId" data-label="Name" class="mention">@Name</span>
  return html.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="([^"]*)"[^>]*>@?([^<]*)<\/span>/g,
    (_match, id, label) => `@[${label}](${id})`,
  );
}

export function CommentSection({ taskId, canComment = true, isProjectAdmin = false }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const { data: comments, isLoading } = useComments(taskId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const { user } = useAuth();
  const { toast } = useToast();

  // Mention members
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: workspaceMembers } = useWorkspaceMembers(activeWorkspaceId ?? '');

  const memberSuggestions = (workspaceMembers || []).map((m: any) => ({
    id: m.userId || m.user?.id,
    name: m.user?.name || m.user?.displayName || `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || 'Unknown',
    avatarUrl: m.user?.avatarUrl || null,
  }));

  // Use a key to force re-mount the editor after submit (clears content)
  const editorKeyRef = useRef(0);
  const [editorKey, setEditorKey] = useState(0);

  const handleSubmit = useCallback(() => {
    if (isContentEmpty(content)) return;
    // Convert mention spans to legacy format for backend
    const storageContent = convertMentionSpansToLegacy(content);
    createComment.mutate(
      { taskId, data: { content: storageContent } },
      {
        onSuccess: () => {
          setContent('');
          editorKeyRef.current += 1;
          setEditorKey(editorKeyRef.current);
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to post comment', description: (err as Error).message });
        },
      },
    );
  }, [content, taskId, createComment, toast]);

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
    <div className="space-y-3">
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
                  <div className="mt-1">
                    <RichTextDisplay content={comment.content} className="text-surface-300" />
                  </div>
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
            <div className="flex-1">
              <RichTextEditor
                key={editorKey}
                content={content}
                onChange={setContent}
                placeholder="Write a comment... Use @ to mention"
                mode="compact"
                members={memberSuggestions}
                onSubmit={handleSubmit}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isContentEmpty(content) || createComment.isPending}
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
