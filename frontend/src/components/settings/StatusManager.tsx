import { useState, useRef, useEffect } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { ProjectStatus } from '@/types/models.types';
import { StatusCategory } from '@/types/models.types';
import {
  useStatuses,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
} from '@/hooks/useStatuses';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const PRESET_COLORS = [
  '#6B7280', '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#6366F1', '#A855F7', '#EC4899',
];

const CATEGORY_OPTIONS = [
  { value: StatusCategory.NOT_STARTED, label: 'Not Started' },
  { value: StatusCategory.ACTIVE, label: 'Active' },
  { value: StatusCategory.DONE, label: 'Done' },
  { value: StatusCategory.CANCELLED, label: 'Cancelled' },
];

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  NOT_STARTED: 'bg-surface-600/20 text-surface-400',
  ACTIVE: 'bg-amber-600/20 text-amber-400',
  DONE: 'bg-emerald-600/20 text-emerald-400',
  CANCELLED: 'bg-red-600/20 text-red-400',
};

interface StatusManagerProps {
  projectId: string;
}

export function StatusManager({ projectId }: StatusManagerProps) {
  const { data: statuses, isLoading } = useStatuses(projectId);
  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);
  const [newCategory, setNewCategory] = useState<StatusCategory>(StatusCategory.NOT_STARTED);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = statuses?.slice().sort((a, b) => a.position - b.position) || [];

  function handleCreate() {
    if (!newName.trim()) return;
    createStatus.mutate(
      {
        projectId,
        data: {
          name: newName.trim(),
          color: newColor,
          category: newCategory,
          position: sorted.length,
        },
      },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(PRESET_COLORS[4]);
          setNewCategory(StatusCategory.TODO);
          setAdding(false);
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to create status', description: (err as Error).message });
        },
      },
    );
  }

  function handleNameSave(statusId: string) {
    if (!editName.trim()) return;
    updateStatus.mutate(
      { projectId, statusId, data: { name: editName.trim() } },
      {
        onSuccess: () => setEditingId(null),
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to update status', description: (err as Error).message });
        },
      },
    );
  }

  function handleCategoryChange(statusId: string, category: string) {
    updateStatus.mutate(
      { projectId, statusId, data: { category } },
      {
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to update status', description: (err as Error).message });
        },
      },
    );
  }

  function handleColorChange(statusId: string, color: string) {
    updateStatus.mutate(
      { projectId, statusId, data: { color } },
      {
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to update status', description: (err as Error).message });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-surface-300">
          Statuses ({sorted.length})
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" />
          Add status
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border border-surface-700 bg-surface-900 p-3 space-y-3">
          <input
            type="text"
            placeholder="Status name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: newColor === color ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as StatusCategory)}
            className="rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} loading={createStatus.isPending}>
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setNewName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {sorted.map((status) => (
          <div
            key={status.id}
            className="flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-surface-800/50"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-surface-600 cursor-grab" />

            <ColorPicker
              color={status.color}
              onChange={(color) => handleColorChange(status.id, color)}
            />

            {editingId === status.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleNameSave(status.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave(status.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(status.id);
                  setEditName(status.name);
                }}
                className="flex-1 text-left text-sm text-surface-200 hover:text-surface-100"
              >
                {status.name}
              </button>
            )}

            <select
              value={status.category}
              onChange={(e) => handleCategoryChange(status.id, e.target.value)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 ${CATEGORY_BADGE_STYLES[status.category] || ''}`}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {confirmDelete === status.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    deleteStatus.mutate(
                      { projectId, statusId: status.id },
                      {
                        onError: (err) => {
                          toast({ type: 'error', title: 'Failed to delete status', description: (err as Error).message });
                        },
                      },
                    );
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
                onClick={() => setConfirmDelete(status.id)}
                className="rounded-md p-1.5 text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="py-4 text-center text-sm text-surface-500">
            No statuses configured
          </p>
        )}
      </div>
    </div>
  );
}

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="h-5 w-5 rounded-full border border-surface-600 shrink-0 hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      />
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 flex flex-wrap gap-1 rounded-lg border border-surface-700 bg-surface-800 p-2 shadow-xl">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: color === c ? 'white' : 'transparent',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
