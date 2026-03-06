import { create } from 'zustand';

interface SelectionState {
  selectedTaskIds: Set<string>;
  selectionMode: boolean;
  lastSelectedTaskId: string | null;
}

interface SelectionActions {
  toggleTask: (taskId: string) => void;
  selectRange: (taskId: string, allIds: string[]) => void;
  selectAll: (taskIds: string[]) => void;
  deselectAll: () => void;
  setSelectionMode: (enabled: boolean) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState & SelectionActions>()((set) => ({
  selectedTaskIds: new Set<string>(),
  selectionMode: false,
  lastSelectedTaskId: null,

  toggleTask: (taskId) =>
    set((state) => {
      const next = new Set(state.selectedTaskIds);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return {
        selectedTaskIds: next,
        selectionMode: next.size > 0 ? true : state.selectionMode,
        lastSelectedTaskId: taskId,
      };
    }),

  selectRange: (taskId, allIds) =>
    set((state) => {
      const lastId = state.lastSelectedTaskId;
      if (!lastId) {
        // No previous selection, just toggle
        const next = new Set(state.selectedTaskIds);
        next.add(taskId);
        return {
          selectedTaskIds: next,
          selectionMode: true,
          lastSelectedTaskId: taskId,
        };
      }

      const startIdx = allIds.indexOf(lastId);
      const endIdx = allIds.indexOf(taskId);

      if (startIdx === -1 || endIdx === -1) {
        // Fallback - just toggle
        const next = new Set(state.selectedTaskIds);
        next.add(taskId);
        return {
          selectedTaskIds: next,
          selectionMode: true,
          lastSelectedTaskId: taskId,
        };
      }

      const min = Math.min(startIdx, endIdx);
      const max = Math.max(startIdx, endIdx);
      const next = new Set(state.selectedTaskIds);
      for (let i = min; i <= max; i++) {
        next.add(allIds[i]);
      }
      return {
        selectedTaskIds: next,
        selectionMode: true,
        lastSelectedTaskId: taskId,
      };
    }),

  selectAll: (taskIds) =>
    set({
      selectedTaskIds: new Set(taskIds),
      selectionMode: true,
    }),

  deselectAll: () =>
    set({
      selectedTaskIds: new Set<string>(),
    }),

  setSelectionMode: (enabled) =>
    set((state) => ({
      selectionMode: enabled,
      selectedTaskIds: enabled ? state.selectedTaskIds : new Set<string>(),
    })),

  clearSelection: () =>
    set({
      selectedTaskIds: new Set<string>(),
      selectionMode: false,
      lastSelectedTaskId: null,
    }),
}));
