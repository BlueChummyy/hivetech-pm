import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTaskTemplates, useCreateTaskFromTemplate } from '@/hooks/useTaskTemplates';
import { useCreateTask } from '@/hooks/useTasks';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import type { TaskTemplate } from '@/types/models.types';

interface CreateTaskModalProps {
  projectId: string;
  statusId: string;
  statusName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTaskModal({ projectId, statusId, statusName, onClose, onSuccess }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const { data: templates } = useTaskTemplates(projectId);
  const createTask = useCreateTask();
  const createFromTemplate = useCreateTaskFromTemplate();
  const { toast } = useToast();

  const selectedTemplate = templates?.find((t: TaskTemplate) => t.id === selectedTemplateId);

  // When a template is selected, pre-fill description
  useEffect(() => {
    if (selectedTemplate) {
      setDescription(selectedTemplate.description || '');
    } else {
      setDescription('');
    }
  }, [selectedTemplateId]);

  const isPending = createTask.isPending || createFromTemplate.isPending;

  async function handleSubmit() {
    if (!title.trim()) return;

    try {
      if (selectedTemplateId) {
        await createFromTemplate.mutateAsync({
          templateId: selectedTemplateId,
          data: {
            projectId,
            statusId,
            title: title.trim(),
            description: description.trim() || undefined,
          },
        });
      } else {
        await createTask.mutateAsync({
          projectId,
          statusId,
          title: title.trim(),
          description: description.trim() || undefined,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to create task',
        description: (err as Error).message || 'Please try again.',
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="w-full max-w-lg rounded-xl border border-surface-700 bg-surface-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-surface-100">
            New Task{statusName ? ` in ${statusName}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-surface-400">Task Name</label>
            <input
              type="text"
              autoFocus
              placeholder="Enter task name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === 'Escape') onClose();
              }}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-400">Template (optional)</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">No template</option>
                {templates.map((t: TaskTemplate) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.priority !== 'NONE' ? ` (${t.priority.toLowerCase()})` : ''}
                  </option>
                ))}
              </select>
              {selectedTemplate && selectedTemplate.subtaskTemplates && (selectedTemplate.subtaskTemplates as any[]).length > 0 && (
                <div className="mt-2 rounded-md bg-surface-900/50 px-3 py-2">
                  <p className="text-xs text-surface-500 mb-1">Will create subtasks:</p>
                  <ul className="space-y-0.5">
                    {(selectedTemplate.subtaskTemplates as any[]).map((sub: any, i: number) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-surface-400">
                        <span className="h-1 w-1 rounded-full bg-surface-500" />
                        {sub.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-surface-400">Description (optional)</label>
            <textarea
              placeholder="Add a description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-700 px-4 py-3">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim()}
            loading={isPending}
          >
            Create Task
          </Button>
        </div>
      </div>
    </div>
  );
}
