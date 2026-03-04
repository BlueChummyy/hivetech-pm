import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/ui.store';

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

      // Ctrl/Cmd + K — Focus global search
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

      // Escape — Close any open modal/panel
      if (e.key === 'Escape') {
        // Let modals handle their own Escape first (they stop propagation).
        // This is a fallback for the task detail panel.
        const { taskPanelOpen, closeTaskPanel, sidebarOpen } = useUIStore.getState();
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
        // Unknown second key — ignore
        return;
      }

      // G prefix — start sequence
      if (e.key === 'g' && !mod) {
        gPrefixRef.current = true;
        // Auto-clear after 1 second if no follow-up
        gTimerRef.current = setTimeout(clearGPrefix, 1000);
        return;
      }

      // ? — Show keyboard shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        onOpenShortcutsModal();
        return;
      }

      // N — placeholder for new task (requires project context)
      if (e.key === 'n' && !mod) {
        // Dispatch a custom event that project pages can listen for
        window.dispatchEvent(new CustomEvent('shortcut:new-task'));
        return;
      }

      // B — Toggle sidebar
      if (e.key === 'b' && !mod) {
        e.preventDefault();
        const { sidebarCollapsed, collapseSidebar } = useUIStore.getState();
        // On desktop, toggle collapsed state. On mobile, toggle overlay.
        if (window.innerWidth >= 1024) {
          collapseSidebar(!sidebarCollapsed);
        } else {
          useUIStore.getState().toggleSidebar();
        }
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
