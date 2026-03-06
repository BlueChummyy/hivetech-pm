import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/ui.store';
import { useSelectionStore } from '@/store/selection.store';
import { useWorkspaceStore } from '@/store/workspace.store';

/**
 * Returns true if the active element is an input, textarea, or contenteditable,
 * meaning keyboard shortcuts should not fire.
 */
function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Get ordered list of visible task IDs from the DOM.
 * Each TaskTableRow has `data-task-id` set on the <tr>.
 */
function getVisibleTaskIds(): string[] {
  const rows = document.querySelectorAll<HTMLElement>('tr[data-task-id]');
  return Array.from(rows).map((r) => r.dataset.taskId!);
}

/**
 * Get the currently focused task ID from the store or DOM.
 */
function getFocusedTaskId(): string | null {
  return useUIStore.getState().focusedTaskId ?? null;
}

export function useKeyboardShortcuts(onOpenShortcutsModal: () => void) {
  const navigate = useNavigate();
  const gPrefixRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGPrefix = useCallback(() => {
    gPrefixRef.current = false;
    if (gTimerRef.current) {
      clearTimeout(gTimerRef.current);
      gTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + K -- Focus global search
      if (mod && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'header input[aria-label="Search"]',
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        clearGPrefix();
        return;
      }

      // Ctrl/Cmd + / -- Toggle sidebar (alternative)
      if (mod && e.key === '/') {
        e.preventDefault();
        const { sidebarCollapsed, collapseSidebar } = useUIStore.getState();
        if (window.innerWidth >= 1024) {
          collapseSidebar(!sidebarCollapsed);
        } else {
          useUIStore.getState().toggleSidebar();
        }
        clearGPrefix();
        return;
      }

      // Ctrl/Cmd + Shift + N -- New project
      if (mod && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:new-project'));
        clearGPrefix();
        return;
      }

      // Ctrl/Cmd + N -- New task (standard shortcut)
      if (mod && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:new-task'));
        clearGPrefix();
        return;
      }

      // Ctrl/Cmd + D -- Duplicate task
      if (mod && e.key === 'd') {
        e.preventDefault();
        const focused = getFocusedTaskId();
        if (focused) {
          window.dispatchEvent(
            new CustomEvent('shortcut:clone-task', { detail: { taskId: focused } }),
          );
        }
        clearGPrefix();
        return;
      }

      // Ctrl/Cmd + Shift + F -- Advanced search/filter
      if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:advanced-filter'));
        clearGPrefix();
        return;
      }

      // Escape -- Close any open modal/panel
      if (e.key === 'Escape') {
        const { taskPanelOpen, closeTaskPanel, sidebarOpen } = useUIStore.getState();
        const { selectedTaskIds, clearSelection } = useSelectionStore.getState();
        if (selectedTaskIds.size > 0) {
          clearSelection();
          clearGPrefix();
          return;
        }
        if (taskPanelOpen) {
          closeTaskPanel();
          clearGPrefix();
          return;
        }
        if (sidebarOpen) {
          useUIStore.setState({ sidebarOpen: false });
          clearGPrefix();
          return;
        }
        clearGPrefix();
        return;
      }

      // Skip single-key shortcuts when typing
      if (isTyping()) return;

      // Handle "G then X" sequences
      if (gPrefixRef.current) {
        clearGPrefix();
        const key = e.key.toLowerCase();
        if (key === 'd') {
          e.preventDefault();
          navigate('/dashboard');
          return;
        }
        if (key === 'm') {
          e.preventDefault();
          navigate('/my-tasks');
          return;
        }
        if (key === 'n') {
          e.preventDefault();
          navigate('/notifications');
          return;
        }
        if (key === 'p') {
          e.preventDefault();
          const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
          if (workspaceId) {
            navigate(`/workspaces/${workspaceId}/projects`);
          } else {
            navigate('/dashboard');
          }
          return;
        }
        if (key === 'a') {
          e.preventDefault();
          navigate('/admin');
          return;
        }
        if (key === 's') {
          e.preventDefault();
          navigate('/settings/profile');
          return;
        }
        // Unknown second key -- ignore
        return;
      }

      // G prefix -- start sequence
      if (e.key === 'g' && !mod) {
        gPrefixRef.current = true;
        // Auto-clear after 1 second if no follow-up
        gTimerRef.current = setTimeout(clearGPrefix, 1000);
        return;
      }

      // ? -- Show keyboard shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        onOpenShortcutsModal();
        return;
      }

      // N -- New task (on project pages)
      if (e.key === 'n' && !mod) {
        window.dispatchEvent(new CustomEvent('shortcut:new-task'));
        return;
      }

      // B -- Toggle sidebar
      if (e.key === 'b' && !mod) {
        e.preventDefault();
        const { sidebarCollapsed, collapseSidebar } = useUIStore.getState();
        if (window.innerWidth >= 1024) {
          collapseSidebar(!sidebarCollapsed);
        } else {
          useUIStore.getState().toggleSidebar();
        }
        return;
      }

      // E -- Edit/open focused task
      if (e.key === 'e' && !mod) {
        const focused = getFocusedTaskId();
        if (focused) {
          e.preventDefault();
          useUIStore.getState().openTaskPanel(focused);
        }
        return;
      }

      // Enter -- Open focused task
      if (e.key === 'Enter' && !mod) {
        const focused = getFocusedTaskId();
        if (focused) {
          e.preventDefault();
          useUIStore.getState().openTaskPanel(focused);
        }
        return;
      }

      // 1-4 -- Set priority of focused task
      if (['1', '2', '3', '4'].includes(e.key) && !mod) {
        const focused = getFocusedTaskId();
        if (focused) {
          e.preventDefault();
          const priorityMap: Record<string, string> = {
            '1': 'URGENT',
            '2': 'HIGH',
            '3': 'MEDIUM',
            '4': 'LOW',
          };
          window.dispatchEvent(
            new CustomEvent('shortcut:set-priority', {
              detail: { taskId: focused, priority: priorityMap[e.key] },
            }),
          );
        }
        return;
      }

      // Delete/Backspace -- Delete focused task (with confirmation)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
        const focused = getFocusedTaskId();
        if (focused) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('shortcut:delete-task', { detail: { taskId: focused } }),
          );
        }
        return;
      }

      // J -- Move focus down in task list
      if (e.key === 'j' && !mod) {
        e.preventDefault();
        const ids = getVisibleTaskIds();
        if (ids.length === 0) return;
        const current = getFocusedTaskId();
        const idx = current ? ids.indexOf(current) : -1;
        const nextIdx = Math.min(idx + 1, ids.length - 1);
        useUIStore.getState().setFocusedTaskId(ids[nextIdx]);
        // Scroll the row into view
        const row = document.querySelector(`tr[data-task-id="${ids[nextIdx]}"]`);
        row?.scrollIntoView({ block: 'nearest' });
        return;
      }

      // K -- Move focus up in task list
      if (e.key === 'k' && !mod) {
        e.preventDefault();
        const ids = getVisibleTaskIds();
        if (ids.length === 0) return;
        const current = getFocusedTaskId();
        const idx = current ? ids.indexOf(current) : ids.length;
        const prevIdx = Math.max(idx - 1, 0);
        useUIStore.getState().setFocusedTaskId(ids[prevIdx]);
        const row = document.querySelector(`tr[data-task-id="${ids[prevIdx]}"]`);
        row?.scrollIntoView({ block: 'nearest' });
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearGPrefix();
    };
  }, [navigate, onOpenShortcutsModal, clearGPrefix]);
}
