import { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  Calendar,
  Tag,
  Link2,
  Paperclip,
  Upload,
  Download,
  Eye,
  Trash2,
  Loader2,
  Activity,
  ArrowRightLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUIStore } from '@/store/ui.store';
import { useTask, useUpdateTask, useDeleteTask, useMoveTaskToProject } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useProjectMembers } from '@/hooks/useMembers';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useLabels, useAttachLabel, useDetachLabel } from '@/hooks/useLabels';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useAttachments';
import { attachmentsApi } from '@/api/attachments';
import { useTaskDependencies } from '@/hooks/useDependencies';
import { StatusSelector } from './StatusSelector';
import { PrioritySelector } from './PrioritySelector';
import { AssigneeSelector } from './AssigneeSelector';
import { SubtaskList } from './SubtaskList';
import { CommentSection } from './CommentSection';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';
import { StatusCategory } from '@/types/models.types';
import type { Priority } from '@/types/models.types';
import { useProjectPermissions } from '@/hooks/useProjectRole';

export function TaskDetailPanel() {
  const taskPanelOpen = useUIStore((s) => s.taskPanelOpen);
  const taskPanelTaskId = useUIStore((s) => s.taskPanelTaskId);
  const closeTaskPanel = useUIStore((s) => s.closeTaskPanel);

  const { data: task, isLoading } = useTask(taskPanelTaskId || '');
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const moveTask = useMoveTaskToProject();
  const permissions = useProjectPermissions(task?.projectId);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: projects } = useProjects(activeWorkspaceId ?? '');

  const { data: statuses } = useStatuses(task?.projectId || '');
  const { data: members } = useProjectMembers(task?.projectId || '');
  const { data: labels } = useLabels(task?.projectId || '');
  const { data: attachments } = useAttachments(taskPanelTaskId || '');
  const { data: dependencies } = useTaskDependencies(taskPanelTaskId || '');
  const attachLabel = useAttachLabel();
  const detachLabel = useDetachLabel();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const { toast } = useToast();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const moveRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setTitleValue(task.title);
      setDescValue(task.description || '');
    }
  }, [task]);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTaskPanel();
    },
    [closeTaskPanel],
  );

  useEffect(() => {
    if (taskPanelOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [taskPanelOpen, handleEscape]);

  useEffect(() => {
    if (!labelDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setLabelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [labelDropdownOpen]);

  useEffect(() => {
    if (!showMoveDropdown) return;
    function handleClick(e: MouseEvent) {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) {
        setShowMoveDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMoveDropdown]);

  const onMutationError = useCallback(
    (err: Error) => {
      toast({ type: 'error', title: 'Failed to update task', description: err.message });
    },
    [toast],
  );

  function saveTitle() {
    if (!task || !titleValue.trim() || titleValue === task.title) {
      setEditingTitle(false);
      return;
    }
    updateTask.mutate(
      { id: task.id, data: { title: titleValue.trim() } },
      { onError: onMutationError },
    );
    setEditingTitle(false);
  }

  function saveDescription() {
    if (!task || descValue === (task.description || '')) return;
    updateTask.mutate(
      { id: task.id, data: { description: descValue } },
      { onError: onMutationError },
    );
  }

  function handleStatusChange(statusId: string) {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, data: { statusId } },
      { onError: onMutationError },
    );
  }

  function handlePriorityChange(priority: Priority) {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, data: { priority } },
      { onError: onMutationError },
    );
  }

  function handleAssigneeChange(assigneeId: string | null) {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, data: { assigneeId } },
      { onError: onMutationError },
    );
  }

  function handleAssigneesChange(assigneeIds: string[]) {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, data: { assigneeIds } },
      { onError: onMutationError },
    );
  }

  function handleStartDateChange(date: string) {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, data: { startDate: date ? `${date}T00:00:00.000Z` : null } },
      { onError: onMutationError },
    );
  }

  function handleDueDateChange(date: string) {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, data: { dueDate: date ? `${date}T00:00:00.000Z` : null } },
      { onError: onMutationError },
    );
  }

  function handleLabelToggle(labelId: string) {
    if (!task) return;
    const isAttached = task.labels?.some((tl) => tl.labelId === labelId);
    if (isAttached) {
      detachLabel.mutate(
        { taskId: task.id, labelId },
        { onError: (err) => toast({ type: 'error', title: 'Failed to remove label', description: (err as Error).message }) },
      );
    } else {
      attachLabel.mutate(
        { taskId: task.id, labelId },
        { onError: (err) => toast({ type: 'error', title: 'Failed to add label', description: (err as Error).message }) },
      );
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    uploadAttachment.mutate(
      { taskId: task.id, file },
      { onError: (err) => toast({ type: 'error', title: 'Failed to upload file', description: (err as Error).message }) },
    );
    e.target.value = '';
  }

  function isPreviewable(mimeType: string) {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  }

  async function handlePreview(attachmentId: string, filename: string) {
    try {
      const url = await attachmentsApi.preview(attachmentId);
      setPreviewUrl(url);
      setPreviewName(filename);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load preview', description: (err as Error).message });
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewName('');
  }

  async function handleDownload(attachmentId: string, filename: string) {
    try {
      const res = await attachmentsApi.download(attachmentId);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to download file', description: (err as Error).message });
    }
  }

  const doneStatus = statuses?.find(
    (s) => s.category === StatusCategory.DONE,
  );

  return (
    <>
      {/* Mobile backdrop */}
      {taskPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeTaskPanel}
        />
      )}

      {/* Panel */}
      <div
        role="complementary"
        aria-label="Task details"
        aria-hidden={!taskPanelOpen}
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full bg-surface-800 border-l border-surface-700 shadow-2xl transition-transform duration-200 ease-in-out sm:w-[480px]',
          taskPanelOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
          </div>
        ) : !task ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-surface-500">Task not found</p>
            <button
              onClick={closeTaskPanel}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              Close panel
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
              <span className="rounded bg-surface-700 px-2 py-0.5 text-xs font-mono text-surface-400">
                #{task.taskNumber}
              </span>
              <div className="flex items-center gap-1">
                {/* Move to project */}
                {permissions.canEditTasks && (
                  <div ref={moveRef} className="relative">
                    <button
                      onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                      aria-label="Move to project"
                      title="Move to project"
                      className="rounded-md p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </button>
                    {showMoveDropdown && projects && (
                      <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-surface-700 bg-surface-800 py-1 shadow-xl">
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                          Move to project
                        </div>
                        {projects
                          .filter((p) => p.id !== task.projectId)
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={async () => {
                                try {
                                  await moveTask.mutateAsync({ id: task.id, targetProjectId: p.id });
                                  setShowMoveDropdown(false);
                                  closeTaskPanel();
                                  toast({ type: 'success', title: 'Task moved', description: `Moved to "${p.name}"` });
                                } catch (err) {
                                  toast({ type: 'error', title: 'Failed to move task', description: (err as Error).message });
                                }
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="ml-auto text-xs text-surface-500">{p.key}</span>
                            </button>
                          ))}
                        {projects.filter((p) => p.id !== task.projectId).length === 0 && (
                          <p className="px-3 py-2 text-sm text-surface-500">No other projects</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Delete task */}
                {permissions.canEditTasks && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label="Delete task"
                    title="Delete task"
                    className="rounded-md p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-surface-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={closeTaskPanel}
                  aria-label="Close task panel"
                  className="rounded-md p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="flex items-center justify-between gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2">
                <span className="text-sm text-red-300">Delete this task?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md px-3 py-1 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteTask.mutateAsync(task.id);
                        setShowDeleteConfirm(false);
                        closeTaskPanel();
                        toast({ type: 'success', title: 'Task deleted' });
                      } catch (err) {
                        toast({ type: 'error', title: 'Failed to delete task', description: (err as Error).message });
                      }
                    }}
                    className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                {/* Title */}
                {editingTitle && permissions.canEditTasks ? (
                  <textarea
                    ref={titleRef}
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveTitle();
                      }
                      if (e.key === 'Escape') {
                        setTitleValue(task.title);
                        setEditingTitle(false);
                      }
                    }}
                    className="w-full resize-none rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-lg font-semibold text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    rows={2}
                  />
                ) : permissions.canEditTasks ? (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="w-full text-left text-lg font-semibold text-surface-100 hover:text-primary-400 transition-colors rounded-md px-1 -mx-1"
                  >
                    {task.title}
                  </button>
                ) : (
                  <h2 className="text-lg font-semibold text-surface-100 px-1 -mx-1">
                    {task.title}
                  </h2>
                )}

                {/* Metadata rows – ClickUp-style */}
                <div className="rounded-lg border border-surface-700 divide-y divide-surface-700">
                  {/* Status */}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <span className="h-2 w-2 rounded-full bg-surface-500" />
                      <span className="text-xs font-medium text-surface-400">Status</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {statuses && permissions.canChangeStatus ? (
                        <StatusSelector
                          statuses={statuses}
                          currentStatusId={task.statusId}
                          onChange={handleStatusChange}
                          disabledCategories={permissions.canCompleteTasks ? [] : ['DONE']}
                        />
                      ) : (
                        <span className="text-sm text-surface-300">
                          {statuses?.find((s) => s.id === task.statusId)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assignees */}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <svg className="h-3.5 w-3.5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      <span className="text-xs font-medium text-surface-400">Assignees</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {members && permissions.canAssignTasks ? (
                        <AssigneeSelector
                          members={members}
                          currentAssigneeId={task.assigneeId}
                          currentAssignee={task.assignee}
                          currentAssignees={task.assignees}
                          onChange={handleAssigneeChange}
                          onChangeMultiple={handleAssigneesChange}
                        />
                      ) : (
                        <span className="text-sm text-surface-300">
                          {task.assignees && task.assignees.length > 0
                            ? task.assignees.map((a) => a.user?.name || a.user?.displayName).join(', ')
                            : task.assignee?.name || task.assignee?.displayName || 'Unassigned'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-surface-500" />
                      <span className="text-xs font-medium text-surface-400">Dates</span>
                    </div>
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {permissions.canAssignDates ? (
                          <input
                            type="date"
                            value={task.startDate ? task.startDate.split('T')[0] : ''}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            title="Start date"
                            className="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
                          />
                        ) : (
                          <span className="text-xs text-surface-400">
                            {task.startDate ? task.startDate.split('T')[0] : 'Start'}
                          </span>
                        )}
                      </div>
                      <span className="text-surface-600 text-xs shrink-0">&rarr;</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {permissions.canAssignDates ? (
                          <input
                            type="date"
                            value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                            onChange={(e) => handleDueDateChange(e.target.value)}
                            title="Due date"
                            className="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
                          />
                        ) : (
                          <span className="text-xs text-surface-400">
                            {task.dueDate ? task.dueDate.split('T')[0] : 'Due'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <svg className="h-3.5 w-3.5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      <span className="text-xs font-medium text-surface-400">Priority</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {permissions.canEditTasks ? (
                        <PrioritySelector
                          currentPriority={task.priority}
                          onChange={handlePriorityChange}
                        />
                      ) : (
                        <span className="text-sm text-surface-300">{task.priority}</span>
                      )}
                    </div>
                  </div>

                  {/* Labels/Tags */}
                  <div className="flex items-start gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-28 shrink-0 pt-0.5">
                      <Tag className="h-3.5 w-3.5 text-surface-500" />
                      <span className="text-xs font-medium text-surface-400">Tags</span>
                    </div>
                    <div ref={labelRef} className="relative flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5">
                        {task.labels?.map((tl) => (
                          <span
                            key={tl.id}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: tl.label?.color || '#6B7280' }}
                          >
                            {tl.label?.name}
                            {permissions.canEditTasks && (
                              <button
                                onClick={() => handleLabelToggle(tl.labelId)}
                                aria-label={`Remove ${tl.label?.name} label`}
                                className="ml-0.5 hover:text-surface-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        ))}
                        {permissions.canEditTasks && (
                          <button
                            onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-surface-600 px-2 py-0.5 text-[11px] text-surface-500 hover:text-surface-300 hover:border-surface-500 transition-colors"
                          >
                            + Add
                          </button>
                        )}
                        {(!task.labels || task.labels.length === 0) && !permissions.canEditTasks && (
                          <span className="text-xs text-surface-500">Empty</span>
                        )}
                      </div>
                      {labelDropdownOpen && labels && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-surface-700 bg-surface-800 py-1 shadow-xl">
                          {labels.map((label) => {
                            const isAttached = task.labels?.some(
                              (tl) => tl.labelId === label.id,
                            );
                            return (
                              <button
                                key={label.id}
                                onClick={() => handleLabelToggle(label.id)}
                                className={cn(
                                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-700',
                                  isAttached ? 'text-surface-100' : 'text-surface-400',
                                )}
                              >
                                <span
                                  className="h-3 w-3 rounded-full shrink-0"
                                  style={{ backgroundColor: label.color }}
                                />
                                <span className="truncate">{label.name}</span>
                                {isAttached && (
                                  <span className="ml-auto text-primary-400 text-xs">
                                    &#10003;
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {labels.length === 0 && (
                            <p className="px-3 py-2 text-sm text-surface-500">No labels</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-surface-500">Description</label>
                  {permissions.canEditTasks ? (
                    <textarea
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      onBlur={saveDescription}
                      placeholder="Add a description..."
                      rows={4}
                      className="w-full resize-none rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-300 min-h-[4rem]">
                      {task.description || 'No description'}
                    </div>
                  )}
                </div>

                {/* Subtasks */}
                <div className="border-t border-surface-700 pt-3">
                  <SubtaskList
                    parentTask={task}
                    subtasks={task.subtasks || []}
                    doneStatusId={doneStatus?.id}
                  />
                </div>

                {/* Dependencies */}
                {dependencies && dependencies.length > 0 && (
                  <div className="border-t border-surface-700 pt-3 space-y-2">
                    <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Dependencies
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {dependencies.map((dep) => (
                        <button
                          key={dep.id}
                          onClick={() => {
                            const targetId =
                              dep.taskId === task.id
                                ? dep.dependsOnTaskId
                                : dep.taskId;
                            useUIStore.getState().openTaskPanel(targetId);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs text-surface-300 hover:border-surface-600 hover:text-surface-200 transition-colors"
                        >
                          <span className="text-surface-500">
                            {dep.type.toLowerCase().replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono">
                            {dep.dependsOnTask?.taskNumber ? `#${dep.dependsOnTask.taskNumber}` : dep.task?.taskNumber ? `#${dep.task.taskNumber}` : '...'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div className="border-t border-surface-700 pt-3">
                  <CommentSection taskId={task.id} canComment={permissions.canComment} isProjectAdmin={permissions.canManageProject} />
                </div>

                {/* Attachments */}
                <div className="border-t border-surface-700 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attachments
                    </h4>
                    {permissions.canEditTasks && (
                      <>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </>
                    )}
                  </div>

                  {attachments && attachments.length > 0 ? (
                    <div className="space-y-1.5">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 rounded-md bg-surface-900 px-3 py-2"
                        >
                          <Paperclip className="h-4 w-4 shrink-0 text-surface-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-surface-200 truncate">
                              {att.originalName || att.filename}
                            </p>
                            <p className="text-xs text-surface-500">
                              {(att.size / 1024).toFixed(1)} KB
                              {att.uploadedBy && ` - ${att.uploadedBy.name || att.uploadedBy.displayName}`}
                            </p>
                          </div>
                          {isPreviewable(att.mimeType) && (
                            <button
                              onClick={() => handlePreview(att.id, att.originalName || att.filename)}
                              aria-label={`View ${att.originalName || att.filename}`}
                              className="rounded-md p-1 text-surface-400 hover:text-primary-400"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(att.id, att.originalName || att.filename)}
                            aria-label={`Download ${att.originalName || att.filename}`}
                            className="rounded-md p-1 text-surface-400 hover:text-surface-200"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {permissions.canEditTasks && (
                            <button
                              onClick={() =>
                                deleteAttachment.mutate(
                                  {
                                    taskId: task.id,
                                    attachmentId: att.id,
                                  },
                                  {
                                    onError: (err) =>
                                      toast({
                                        type: 'error',
                                        title: 'Failed to delete attachment',
                                        description: (err as Error).message,
                                      }),
                                  },
                                )
                              }
                              aria-label={`Delete ${att.originalName || att.filename}`}
                              className="rounded-md p-1 text-surface-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-surface-500">No attachments</p>
                  )}
                </div>

                {/* Activity placeholder */}
                <div className="border-t border-surface-700 pt-3 space-y-2">
                  <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Activity
                  </h4>
                  <div className="space-y-2">
                    <p className="text-xs text-surface-500">
                      Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      {task.reporter && ` by ${task.reporter.name || task.reporter.displayName}`}
                    </p>
                    {task.updatedAt !== task.createdAt && (
                      <p className="text-xs text-surface-500">
                        Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                      </p>
                    )}
                    {task.status?.category === 'DONE' && (
                      <p className="text-xs text-surface-500">
                        Status: Done
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachment preview lightbox */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
          onClick={closePreview}
        >
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 rounded-full bg-surface-800/80 p-2 text-white hover:bg-surface-700 transition-colors"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
          <p className="absolute top-4 left-4 text-sm text-white/70 truncate max-w-[60%]">{previewName}</p>
          {previewName.match(/\.pdf$/i) ? (
            <iframe
              src={previewUrl}
              title={previewName}
              className="h-[85vh] w-[85vw] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={previewUrl}
              alt={previewName}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
