import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  taskPanelOpen: boolean;
  taskPanelTaskId: string | null;
  theme: Theme;
}

interface UIActions {
  toggleSidebar: () => void;
  collapseSidebar: (collapsed: boolean) => void;
  openTaskPanel: (taskId: string) => void;
  closeTaskPanel: () => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  taskPanelOpen: false,
  taskPanelTaskId: null,
  theme: 'dark',

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  collapseSidebar: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  openTaskPanel: (taskId) =>
    set({ taskPanelOpen: true, taskPanelTaskId: taskId }),

  closeTaskPanel: () =>
    set({ taskPanelOpen: false, taskPanelTaskId: null }),

  setTheme: (theme) => set({ theme }),
}));
