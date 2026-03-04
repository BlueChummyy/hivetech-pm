import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreHorizontal, Pencil, Copy, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { useDeleteTask, useCloneTask, useCloseTask, useReopenTask } from '@/hooks/useTasks';
import { useToast } from '@/components/ui/Toast';
import type { Task } from '@/types/models.types';

interface TaskContextMenuProps {
  task: Task;
  className?: string;
}

export function TaskContextMenu({ task, className }: TaskContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteTask = useDeleteTask();
  const cloneTask = useCloneTask();
  const closeTaskMut = useCloseTask();
  const reopenTaskMut = useReopenTask();
  const { toast } = useToast();

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // Position menu below-right of trigger, but ensure it stays in viewport
        const menuWidth = 180;
        let left = rect.right - menuWidth;
        if (left < 8) left = rect.left;
        setPos({ top: rect.bottom + 4, left });
      }
      return !prev;
    });
    setConfirmDelete(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    useUIStore.getState().openTaskPanel(task.id);
  };

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    cloneTask.mutate(task.id, {
      onSuccess: () => {
        toast({ type: 'success', title: 'Task cloned', description: `"Copy of ${task.title}" created` });
      },
      onError: () => {
        toast({ type: 'error', title: 'Failed to clone task' });
      },
    });
  };

  const handleCloseReopen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    if (task.closedAt) {
      reopenTaskMut.mutate(task.id, {
        onSuccess: () => toast({ type: 'success', title: 'Task reopened' }),
        onError: () => toast({ type: 'error', title: 'Failed to reopen task' }),
      });
    } else {
      closeTaskMut.mutate(task.id, {
        onSuccess: () => toast({ type: 'success', title: 'Task closed' }),
        onError: () => toast({ type: 'error', title: 'Failed to close task' }),
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    // Confirmed - delete
    setOpen(false);
    setConfirmDelete(false);
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast({ type: 'success', title: 'Task deleted' });
      },
      onError: () => {
        toast({ type: 'error', title: 'Failed to delete task' });
      },
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        onMouseDown={handleToggle}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        className={cn(
          'flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-gray-200',
          className,
        )}
        aria-label="Task actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="min-w-[170px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999 }}
        >
          <button
            role="menuitem"
            onMouseDown={handleEdit}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06]"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            role="menuitem"
            onMouseDown={handleClone}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06]"
          >
            <Copy className="h-4 w-4" />
            Clone
          </button>
          <button
            role="menuitem"
            onMouseDown={handleCloseReopen}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06]"
          >
            {task.closedAt ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Reopen
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Close
              </>
            )}
          </button>
          <div className="my-1 border-t border-white/[0.06]" />
          <button
            role="menuitem"
            onMouseDown={handleDeleteClick}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm',
              confirmDelete
                ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20'
                : 'text-red-400 hover:bg-red-500/10',
            )}
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? 'Click again to confirm' : 'Delete'}
          </button>
        </div>
      )}
    </>
  );
}
