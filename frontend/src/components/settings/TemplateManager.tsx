import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import type { TaskTemplate } from '@/types/models.types';
import {
  useTaskTemplates,
  useCreateTaskTemplate,
  useUpdateTaskTemplate,
  useDeleteTaskTemplate,
} from '@/hooks/useTaskTemplates';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const PRIORITY_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

interface TemplateManagerProps {
  projectId: string;
}

export function TemplateManager({ projectId }: TemplateManagerProps) {
  const { data: templates, isLoading } = useTaskTemplates(projectId);
  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('NONE');
  const [newSubtasks, setNewSubtasks] = useState<{ title: string; priority?: string }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('NONE');
  const [editSubtasks, setEditSubtasks] = useState<{ title: string; priority?: string }[]>([]);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function resetAddForm() {
    setNewName('');
    setNewDescription('');
    setNewPriority('NONE');
    setNewSubtasks([]);
    setNewSubtaskTitle('');
    setAdding(false);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    createTemplate.mutate(
      {
        projectId,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        subtaskTemplates: newSubtasks.length > 0 ? newSubtasks : undefined,
      },
      {
        onSuccess: () => resetAddForm(),
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to create template', description: (err as Error).message });
        },
      },
    );
  }

  function addNewSubtask() {
    if (!newSubtaskTitle.trim()) return;
    setNewSubtasks([...newSubtasks, { title: newSubtaskTitle.trim() }]);
    setNewSubtaskTitle('');
  }

  function startEdit(template: TaskTemplate) {
    setEditingId(template.id);
    setEditName(template.name);
    setEditDescription(template.description || '');
    setEditPriority(template.priority);
    setEditSubtasks(template.subtaskTemplates || []);
    setEditSubtaskTitle('');
    setExpandedId(template.id);
  }

  function saveEdit(templateId: string) {
    updateTemplate.mutate(
      {
        id: templateId,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          subtaskTemplates: editSubtasks,
        },
      },
      {
        onSuccess: () => setEditingId(null),
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to update template', description: (err as Error).message });
        },
      },
    );
  }

  function addEditSubtask() {
    if (!editSubtaskTitle.trim()) return;
    setEditSubtasks([...editSubtasks, { title: editSubtaskTitle.trim() }]);
    setEditSubtaskTitle('');
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-surface-300">
          Task Templates ({templates?.length || 0})
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" />
          Add template
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border border-surface-700 bg-surface-900 p-3 space-y-3">
          <input
            type="text"
            placeholder="Template name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          <textarea
            placeholder="Default description (optional)..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div>
            <label className="block text-xs text-surface-400 mb-1">Default Priority</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Subtask Templates</label>
            {newSubtasks.map((sub, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="text-sm text-surface-300 flex-1">{sub.title}</span>
                <button
                  onClick={() => setNewSubtasks(newSubtasks.filter((_, idx) => idx !== i))}
                  className="text-surface-500 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewSubtask()}
                className="flex-1 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={addNewSubtask}
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                Add
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} loading={createTemplate.isPending}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={resetAddForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {templates?.map((template) => (
          <div key={template.id} className="rounded-lg border border-surface-700/50">
            <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-800/50">
              <button
                onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                className="text-surface-400 hover:text-surface-300"
              >
                {expandedId === template.id ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <FileText className="h-4 w-4 text-surface-500 shrink-0" />
              {editingId === template.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(template.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => startEdit(template)}
                  className="flex-1 text-left text-sm text-surface-200 hover:text-surface-100"
                >
                  {template.name}
                </button>
              )}
              <span className="text-xs text-surface-500">
                {template.priority !== 'NONE' && template.priority.toLowerCase()}
              </span>
              {editingId === template.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => saveEdit(template.id)}
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-surface-400 hover:text-surface-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : confirmDelete === template.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      deleteTemplate.mutate(template.id, {
                        onError: (err) => {
                          toast({ type: 'error', title: 'Failed to delete template', description: (err as Error).message });
                        },
                      });
                      setConfirmDelete(null);
                    }}
                    className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="rounded px-2 py-1 text-xs text-surface-400 hover:bg-surface-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(template.id)}
                  className="rounded-md p-1.5 text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {expandedId === template.id && (
              <div className="border-t border-surface-700/50 px-4 py-3 space-y-2">
                {editingId === template.id ? (
                  <>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Description</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Subtask Templates</label>
                      {editSubtasks.map((sub, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-surface-300 flex-1">{sub.title}</span>
                          <button
                            onClick={() => setEditSubtasks(editSubtasks.filter((_, idx) => idx !== i))}
                            className="text-surface-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add subtask..."
                          value={editSubtaskTitle}
                          onChange={(e) => setEditSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addEditSubtask()}
                          className="flex-1 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <button
                          onClick={addEditSubtask}
                          className="text-xs text-primary-400 hover:text-primary-300"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {template.description && (
                      <p className="text-sm text-surface-400">{template.description}</p>
                    )}
                    {!template.description && (
                      <p className="text-sm text-surface-500 italic">No description</p>
                    )}
                    {template.subtaskTemplates && (template.subtaskTemplates as any[]).length > 0 && (
                      <div>
                        <p className="text-xs text-surface-500 mb-1">Subtasks:</p>
                        <ul className="space-y-0.5">
                          {(template.subtaskTemplates as any[]).map((sub: any, i: number) => (
                            <li key={i} className="text-sm text-surface-300 flex items-center gap-2">
                              <span className="h-1 w-1 rounded-full bg-surface-500" />
                              {sub.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {templates?.length === 0 && (
          <p className="py-4 text-center text-sm text-surface-500">
            No task templates created yet
          </p>
        )}
      </div>
    </div>
  );
}
