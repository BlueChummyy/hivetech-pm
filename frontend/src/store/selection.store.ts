import { create } from 'zustand';

interface SelectionState {
  selectedTaskIds: Set<string>;
  selectionMode: boolean;
}

interface SelectionActions {
  toggleTask: (taskId: string) => void;
  selectAll: (taskIds: string[]) => void;
  deselectAll: () => void;
  setSelectionMode: (enabled: boolean) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState & SelectionActions>()((set) => ({
  selectedTaskIds: new Set<string>(),
  selectionMode: false,

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
    }),
}));
