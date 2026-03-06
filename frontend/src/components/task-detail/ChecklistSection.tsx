import { useState, useRef, useEffect } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import {
  useChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from '@/hooks/useChecklist';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

interface ChecklistSectionProps {
  taskId: string;
  canEdit: boolean;
}

export function ChecklistSection({ taskId, canEdit }: ChecklistSectionProps) {
  const { data: items, isLoading } = useChecklist(taskId);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const { toast } = useToast();

  const [newItemTitle, setNewItemTitle] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  function handleCreate() {
    if (!newItemTitle.trim()) return;
    createItem.mutate(
      { taskId, title: newItemTitle.trim() },
      {
        onSuccess: () => {
          setNewItemTitle('');
          // Keep input open for quick successive adds
        },
        onError: (err) =>
          toast({ type: 'error', title: 'Failed to add item', description: (err as Error).message }),
      },
    );
  }

  function handleToggle(itemId: string, currentChecked: boolean) {
    updateItem.mutate(
      { taskId, itemId, data: { isChecked: !currentChecked } },
      {
        onError: (err) =>
          toast({ type: 'error', title: 'Failed to update item', description: (err as Error).message }),
      },
    );
  }

  function handleRename(itemId: string) {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    updateItem.mutate(
      { taskId, itemId, data: { title: editTitle.trim() } },
      {
        onSuccess: () => setEditingId(null),
        onError: (err) =>
          toast({ type: 'error', title: 'Failed to rename item', description: (err as Error).message }),
      },
    );
  }

  function handleDelete(itemId: string) {
    deleteItem.mutate(
      { taskId, itemId },
      {
        onError: (err) =>
          toast({ type: 'error', title: 'Failed to delete item', description: (err as Error).message }),
      },
    );
  }

  const checkedCount = items?.filter((i) => i.isChecked).length ?? 0;
  const totalCount = items?.length ?? 0;
  const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5" />
          Checklist
        </h4>
        <p className="text-xs text-surface-500">Loading...</p>
      </div>
    );
  }

  // Don't show the section at all if no items and user can't edit
  if (!canEdit && totalCount === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5" />
          Checklist
          {totalCount > 0 && (
            <span className="text-xs text-surface-500 font-normal ml-1">
              {checkedCount}/{totalCount}
            </span>
          )}
        </h4>
        {canEdit && !showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 w-full rounded-full bg-surface-700 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              progressPercent === 100 ? 'bg-green-500' : 'bg-primary-500',
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Checklist items */}
      {items && items.length > 0 && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={item.isChecked}
                onChange={() => canEdit && handleToggle(item.id, item.isChecked)}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer disabled:cursor-default"
              />

              {editingId === item.id ? (
                <input
                  ref={editRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleRename(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(item.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 rounded-md border border-surface-700 bg-surface-900 px-2 py-0.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              ) : (
                <span
                  className={cn(
                    'flex-1 text-sm cursor-default',
                    item.isChecked
                      ? 'text-surface-500 line-through'
                      : 'text-surface-200',
                    canEdit && 'cursor-pointer',
                  )}
                  onClick={() => {
                    if (canEdit) {
                      setEditingId(item.id);
                      setEditTitle(item.title);
                    }
                  }}
                >
                  {item.title}
                </span>
              )}

              {canEdit && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-md p-0.5 text-surface-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                  title="Delete item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new item input */}
      {showInput && canEdit && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setShowInput(false);
                setNewItemTitle('');
              }
            }}
            placeholder="Add an item..."
            className="flex-1 rounded-md border border-surface-700 bg-surface-900 px-2 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newItemTitle.trim() || createItem.isPending}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowInput(false);
              setNewItemTitle('');
            }}
            className="rounded-md px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
