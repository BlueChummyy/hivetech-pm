import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { StatusCategory } from '@/types/models.types';
import type { ProjectStatus } from '@/types/models.types';
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

function calculatePosition(items: ProjectStatus[], overIndex: number): number {
  if (items.length === 0) return 1000;
  if (overIndex === 0) return items[0].position / 2;
  if (overIndex >= items.length) return items[items.length - 1].position + 1000;
  return (items[overIndex - 1].position + items[overIndex].position) / 2;
}

interface StatusManagerProps {
  projectId: string;
}

/* ------------------------------------------------------------------ */
/*  SortableStatusRow                                                  */
/* ------------------------------------------------------------------ */
interface SortableStatusRowProps {
  status: ProjectStatus;
  projectId: string;
  editingId: string | null;
  editName: string;
  confirmDelete: string | null;
  deleteError: string | null;
  reassignTarget: string;
  allStatuses: ProjectStatus[];
  onStartEdit: (id: string, name: string) => void;
  onEditNameChange: (name: string) => void;
  onNameSave: (statusId: string) => void;
  onCancelEdit: () => void;
  onCategoryChange: (statusId: string, category: string) => void;
  onColorChange: (statusId: string, color: string) => void;
  onConfirmDelete: (id: string | null) => void;
  onReassignTargetChange: (id: string) => void;
  onDelete: (statusId: string) => void;
  overlay?: boolean;
}

function SortableStatusRow({
  status,
  editingId,
  editName,
  confirmDelete,
  deleteError,
  reassignTarget,
  allStatuses,
  onStartEdit,
  onEditNameChange,
  onNameSave,
  onCancelEdit,
  onCategoryChange,
  onColorChange,
  onConfirmDelete,
  onReassignTargetChange,
  onDelete,
  overlay,
}: SortableStatusRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-surface-800/50',
        isDragging && 'opacity-50',
        overlay && 'bg-surface-800 shadow-xl shadow-black/40 border border-surface-700 rounded-lg',
      )}
    >
      <button
        {...(overlay ? {} : attributes)}
        {...(overlay ? {} : listeners)}
        className="cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-surface-600" />
      </button>

      <ColorPicker
        color={status.color}
        onChange={(color) => onColorChange(status.id, color)}
      />

      {editingId === status.id ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={() => onNameSave(status.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onNameSave(status.id);
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="flex-1 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          autoFocus
        />
      ) : (
        <button
          onClick={() => onStartEdit(status.id, status.name)}
          className="flex-1 text-left text-sm text-surface-200 hover:text-surface-100"
        >
          {status.name}
        </button>
      )}

      <select
        value={status.category}
        onChange={(e) => onCategoryChange(status.id, e.target.value)}
        className={`rounded-md px-2 py-0.5 text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 ${CATEGORY_BADGE_STYLES[status.category] || ''}`}
      >
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {confirmDelete === status.id ? (
        <div className="flex items-center gap-1 flex-wrap">
          {deleteError && (
            <>
              <span className="text-xs text-red-400 w-full mb-1">{deleteError}</span>
              <select
                value={reassignTarget}
                onChange={(e) => onReassignTargetChange(e.target.value)}
                className="rounded-md border border-surface-700 bg-surface-800 px-2 py-0.5 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Move tasks to...</option>
                {allStatuses
                  .filter((s) => s.id !== status.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
            </>
          )}
          <button
            onClick={() => onDelete(status.id)}
            disabled={!!deleteError && !reassignTarget}
            className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete
          </button>
          <button
            onClick={() => onConfirmDelete(null)}
            className="rounded px-2 py-1 text-xs text-surface-400 hover:bg-surface-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => onConfirmDelete(status.id)}
          className="rounded-md p-1.5 text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusManager                                                      */
/* ------------------------------------------------------------------ */
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
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<ProjectStatus | null>(null);

  const sorted = statuses?.slice().sort((a, b) => a.position - b.position) || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleCreate() {
    if (!newName.trim()) return;
    createStatus.mutate(
      {
        projectId,
        data: {
          name: newName.trim(),
          color: newColor,
          category: newCategory,
          position: sorted.length > 0 ? sorted[sorted.length - 1].position + 1000 : 1000,
        },
      },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(PRESET_COLORS[4]);
          setNewCategory(StatusCategory.NOT_STARTED);
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

  function handleDelete(statusId: string) {
    setDeleteError(null);
    deleteStatus.mutate(
      { projectId, statusId, reassignToStatusId: reassignTarget || undefined },
      {
        onSuccess: () => {
          setConfirmDelete(null);
          setReassignTarget('');
          setDeleteError(null);
        },
        onError: (err) => {
          const msg = (err as Error).message;
          if (msg.includes('reassignToStatusId')) {
            setDeleteError('This status has tasks. Select a status to move them to.');
          } else {
            toast({ type: 'error', title: 'Failed to delete status', description: msg });
            setConfirmDelete(null);
            setReassignTarget('');
          }
        },
      },
    );
  }

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const status = sorted.find((s) => s.id === event.active.id);
      if (status) setActiveStatus(status);
    },
    [sorted],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveStatus(null);

      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const withoutActive = sorted.filter((s) => s.id !== activeId);
      const overIndex = withoutActive.findIndex((s) => s.id === overId);
      const position = calculatePosition(
        withoutActive,
        overIndex === -1 ? withoutActive.length : overIndex,
      );

      updateStatus.mutate(
        { projectId, statusId: activeId, data: { position } },
        {
          onError: (err) => {
            toast({ type: 'error', title: 'Failed to reorder status', description: (err as Error).message });
          },
        },
      );
    },
    [sorted, projectId, updateStatus, toast],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-700" />
        ))}
      </div>
    );
  }

  const statusIds = sorted.map((s) => s.id);

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-1">
          <SortableContext items={statusIds} strategy={verticalListSortingStrategy}>
            {sorted.map((status) => (
              <SortableStatusRow
                key={status.id}
                status={status}
                projectId={projectId}
                editingId={editingId}
                editName={editName}
                confirmDelete={confirmDelete}
                deleteError={deleteError}
                reassignTarget={reassignTarget}
                allStatuses={sorted}
                onStartEdit={(id, name) => {
                  setEditingId(id);
                  setEditName(name);
                }}
                onEditNameChange={setEditName}
                onNameSave={handleNameSave}
                onCancelEdit={() => setEditingId(null)}
                onCategoryChange={handleCategoryChange}
                onColorChange={handleColorChange}
                onConfirmDelete={(id) => {
                  setConfirmDelete(id);
                  setDeleteError(null);
                  setReassignTarget('');
                }}
                onReassignTargetChange={setReassignTarget}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
          {sorted.length === 0 && (
            <p className="py-4 text-center text-sm text-surface-500">
              No statuses configured
            </p>
          )}
        </div>

        <DragOverlay>
          {activeStatus ? (
            <SortableStatusRow
              status={activeStatus}
              projectId={projectId}
              editingId={null}
              editName=""
              confirmDelete={null}
              deleteError={null}
              reassignTarget=""
              allStatuses={sorted}
              onStartEdit={() => {}}
              onEditNameChange={() => {}}
              onNameSave={() => {}}
              onCancelEdit={() => {}}
              onCategoryChange={() => {}}
              onColorChange={() => {}}
              onConfirmDelete={() => {}}
              onReassignTargetChange={() => {}}
              onDelete={() => {}}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pickerHeight = 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < pickerHeight
        ? rect.top - pickerHeight
        : rect.bottom + 4;
      setPos({ top: Math.max(8, top), left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="h-5 w-5 rounded-full border border-surface-600 shrink-0 hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      />
      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] flex flex-wrap gap-1 rounded-lg border border-surface-700 bg-surface-800 p-2 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
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
          </div>,
          document.body,
        )}
    </>
  );
}
