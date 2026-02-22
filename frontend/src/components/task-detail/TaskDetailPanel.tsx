import { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  Calendar,
  Tag,
  Link2,
  Paperclip,
  Upload,
  Download,
  Trash2,
  Loader2,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUIStore } from '@/store/ui.store';
import { useTask, useUpdateTask } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useProjectMembers } from '@/hooks/useMembers';
import { useLabels, useAttachLabel, useDetachLabel } from '@/hooks/useLabels';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useAttachments';
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

export function TaskDetailPanel() {
  const taskPanelOpen = useUIStore((s) => s.taskPanelOpen);
  const taskPanelTaskId = useUIStore((s) => s.taskPanelTaskId);
  const closeTaskPanel = useUIStore((s) => s.closeTaskPanel);

  const { data: task, isLoading } = useTask(taskPanelTaskId || '');
  const updateTask = useUpdateTask();

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

  function handleDueDateChange(date: string) {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, data: { dueDate: date || null } },
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
              <button
                onClick={closeTaskPanel}
                aria-label="Close task panel"
                className="rounded-md p-1 text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-4">
                {/* Title */}
                {editingTitle ? (
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
                ) : (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="w-full text-left text-lg font-semibold text-surface-100 hover:text-primary-400 transition-colors rounded-md px-1 -mx-1"
                  >
                    {task.title}
                  </button>
                )}

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-500">Status</label>
                    {statuses && (
                      <StatusSelector
                        statuses={statuses}
                        currentStatusId={task.statusId}
                        onChange={handleStatusChange}
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-500">Priority</label>
                    <PrioritySelector
                      currentPriority={task.priority}
                      onChange={handlePriorityChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-500">Assignee</label>
                    {members && (
                      <AssigneeSelector
                        members={members}
                        currentAssigneeId={task.assigneeId}
                        currentAssignee={task.assignee}
                        onChange={handleAssigneeChange}
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-500">Due date</label>
                    <div className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5">
                      <Calendar className="h-4 w-4 text-surface-500" />
                      <input
                        type="date"
                        value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-surface-200 focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-surface-500 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Labels
                  </label>
                  <div ref={labelRef} className="relative">
                    <div className="flex flex-wrap gap-1.5">
                      {task.labels?.map((tl) => (
                        <span
                          key={tl.id}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: tl.label?.color || '#6B7280' }}
                        >
                          {tl.label?.name}
                          <button
                            onClick={() => handleLabelToggle(tl.labelId)}
                            aria-label={`Remove ${tl.label?.name} label`}
                            className="ml-0.5 hover:text-surface-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-surface-600 px-2.5 py-0.5 text-xs text-surface-500 hover:text-surface-300 hover:border-surface-500 transition-colors"
                      >
                        + Add label
                      </button>
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

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-surface-500">Description</label>
                  <textarea
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    onBlur={saveDescription}
                    placeholder="Add a description..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Subtasks */}
                <div className="border-t border-surface-700 pt-4">
                  <SubtaskList
                    parentTask={task}
                    subtasks={task.subtasks || []}
                    doneStatusId={doneStatus?.id}
                  />
                </div>

                {/* Dependencies */}
                {dependencies && dependencies.length > 0 && (
                  <div className="border-t border-surface-700 pt-4 space-y-2">
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
                <div className="border-t border-surface-700 pt-4">
                  <CommentSection taskId={task.id} />
                </div>

                {/* Attachments */}
                <div className="border-t border-surface-700 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attachments
                    </h4>
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
                              {att.uploadedBy && ` - ${att.uploadedBy.name}`}
                            </p>
                          </div>
                          <a
                            href={`/api/v1/tasks/${task.id}/attachments/${att.id}/download`}
                            download
                            aria-label={`Download ${att.originalName || att.filename}`}
                            className="rounded-md p-1 text-surface-400 hover:text-surface-200"
                          >
                            <Download className="h-4 w-4" />
                          </a>
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-surface-500">No attachments</p>
                  )}
                </div>

                {/* Activity placeholder */}
                <div className="border-t border-surface-700 pt-4 space-y-2">
                  <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Activity
                  </h4>
                  <div className="space-y-2">
                    <p className="text-xs text-surface-500">
                      Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      {task.reporter && ` by ${task.reporter.name}`}
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
    </>
  );
}
