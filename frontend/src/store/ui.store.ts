import { create } from 'zustand';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  }
  return 'dark';
}

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  taskPanelOpen: boolean;
  taskPanelTaskId: string | null;
  focusedTaskId: string | null;
  theme: Theme;
}

interface UIActions {
  toggleSidebar: () => void;
  collapseSidebar: (collapsed: boolean) => void;
  openTaskPanel: (taskId: string) => void;
  closeTaskPanel: () => void;
  setFocusedTaskId: (taskId: string | null) => void;
  setTheme: (theme: Theme) => void;
}

const initialTheme = getInitialTheme();

export const useUIStore = create<UIState & UIActions>()((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  taskPanelOpen: false,
  taskPanelTaskId: null,
  focusedTaskId: null,
  theme: initialTheme,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  collapseSidebar: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  openTaskPanel: (taskId) =>
    set({ taskPanelOpen: true, taskPanelTaskId: taskId }),

  closeTaskPanel: () =>
    set({ taskPanelOpen: false, taskPanelTaskId: null }),

  setFocusedTaskId: (taskId) =>
    set({ focusedTaskId: taskId }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },
}));

// Apply theme on load
applyThemeToDOM(initialTheme);
