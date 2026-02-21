import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Label } from '@/types/models.types';
import {
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
} from '@/hooks/useLabels';
import { Button } from '@/components/ui/Button';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#6B7280',
];

interface LabelManagerProps {
  projectId: string;
}

export function LabelManager({ projectId }: LabelManagerProps) {
  const { data: labels, isLoading } = useLabels(projectId);
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    createLabel.mutate(
      { projectId, data: { name: newName.trim(), color: newColor } },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(PRESET_COLORS[0]);
          setAdding(false);
        },
      },
    );
  }

  function startEdit(label: Label) {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  }

  function saveEdit(labelId: string) {
    updateLabel.mutate(
      { projectId, labelId, data: { name: editName.trim(), color: editColor } },
      { onSuccess: () => setEditingId(null) },
    );
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
          Labels ({labels?.length || 0})
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" />
          Add label
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border border-surface-700 bg-surface-900 p-3 space-y-3">
          <input
            type="text"
            placeholder="Label name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: newColor === color ? 'white' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} loading={createLabel.isPending}>
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
        {labels?.map((label) => (
          <div
            key={label.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-800/50"
          >
            {editingId === label.id ? (
              <>
                <div className="relative">
                  <button
                    className="h-5 w-5 rounded-full border border-surface-600"
                    style={{ backgroundColor: editColor }}
                  />
                  <div className="absolute left-0 top-full z-10 mt-1 flex flex-wrap gap-1 rounded-lg border border-surface-700 bg-surface-800 p-2 shadow-xl">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor:
                            editColor === color ? 'white' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(label.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
                <button
                  onClick={() => saveEdit(label.id)}
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
              </>
            ) : (
              <>
                <span
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <button
                  onClick={() => startEdit(label)}
                  className="flex-1 text-left text-sm text-surface-200 hover:text-surface-100"
                >
                  {label.name}
                </button>
                {confirmDelete === label.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        deleteLabel.mutate({ projectId, labelId: label.id });
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
                    onClick={() => setConfirmDelete(label.id)}
                    className="rounded-md p-1.5 text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        {labels?.length === 0 && (
          <p className="py-4 text-center text-sm text-surface-500">
            No labels created yet
          </p>
        )}
      </div>
    </div>
  );
}
