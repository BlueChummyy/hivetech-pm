import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '@/types/models.types';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';

interface CommentSectionProps {
  taskId: string;
  canComment?: boolean;
  isProjectAdmin?: boolean;
}

// Parse @[User Name](userId) into React elements with highlighted mentions
function renderCommentContent(content: string) {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | { name: string; id: string })[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ name: match[1], id: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.map((part, i) => {
    if (typeof part === 'string') {
      return <span key={i}>{part}</span>;
    }
    return (
      <span
        key={i}
        className="inline-block rounded bg-primary-500/20 px-1 text-primary-300 font-medium"
      >
        @{part.name}
      </span>
    );
  });
}

interface MemberSuggestion {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export function CommentSection({ taskId, canComment = true, isProjectAdmin = false }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const { data: comments, isLoading } = useComments(taskId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const { user } = useAuth();
  const { toast } = useToast();

  // Mention autocomplete state
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: workspaceMembers } = useWorkspaceMembers(activeWorkspaceId ?? '');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const memberSuggestions: MemberSuggestion[] = (workspaceMembers || []).map((m: any) => ({
    id: m.id,
    userId: m.userId || m.user?.id,
    name: m.user?.name || m.user?.displayName || `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || 'Unknown',
    avatarUrl: m.user?.avatarUrl || null,
  }));

  const filteredSuggestions = mentionQuery !== null
    ? memberSuggestions.filter((m) =>
        m.name.toLowerCase().includes(mentionQuery.toLowerCase()),
      ).slice(0, 8)
    : [];

  // Reset mention index when suggestions change
  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  const closeMentionDropdown = useCallback(() => {
    setMentionQuery(null);
    setMentionIndex(0);
  }, []);

  function insertMention(member: MemberSuggestion) {
    const before = content.slice(0, mentionStartPos);
    const after = content.slice(textareaRef.current?.selectionStart ?? content.length);
    // Remove the trailing partial @query text between mentionStartPos and cursor
    const newContent = `${before}@[${member.name}](${member.userId}) ${after}`;
    setContent(newContent);
    closeMentionDropdown();
    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPos = before.length + `@[${member.name}](${member.userId}) `.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);

    const cursorPos = e.target.selectionStart;
    // Look back from cursor for @ sign that starts a mention
    const textUpToCursor = value.slice(0, cursorPos);
    const lastAtIndex = textUpToCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const charBeforeAt = lastAtIndex > 0 ? textUpToCursor[lastAtIndex - 1] : ' ';
      // @ must be at start or preceded by whitespace
      if (lastAtIndex === 0 || /\s/.test(charBeforeAt)) {
        const query = textUpToCursor.slice(lastAtIndex + 1);
        // Only show dropdown if query doesn't contain newlines or special bracket chars
        if (!query.includes('\n') && !query.includes('[') && !query.includes(']')) {
          setMentionQuery(query);
          setMentionStartPos(lastAtIndex);
          return;
        }
      }
    }
    closeMentionDropdown();
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredSuggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMentionDropdown();
        return;
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  }

  function handleSubmit() {
    if (!content.trim()) return;
    closeMentionDropdown();
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
                  <p className="mt-1 text-sm text-surface-300 whitespace-pre-wrap break-words">
                    {renderCommentContent(comment.content)}
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
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                onBlur={() => {
                  // Delay to allow click on dropdown item
                  setTimeout(() => closeMentionDropdown(), 200);
                }}
                placeholder="Write a comment... Use @ to mention"
                rows={2}
                className="w-full resize-none rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {/* Mention autocomplete dropdown */}
              {mentionQuery !== null && filteredSuggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 bottom-full z-50 mb-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-surface-700 bg-surface-800 py-1 shadow-xl"
                >
                  {filteredSuggestions.map((member, idx) => (
                    <button
                      key={member.userId}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(member);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                        idx === mentionIndex
                          ? 'bg-primary-500/20 text-surface-100'
                          : 'text-surface-300 hover:bg-surface-700'
                      }`}
                    >
                      <Avatar src={member.avatarUrl} name={member.name} size="sm" />
                      <span className="truncate">{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
