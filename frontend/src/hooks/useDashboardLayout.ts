import { useState, useCallback } from 'react';

export type WidgetId =
  | 'stat-cards'
  | 'recently-viewed'
  | 'status-chart'
  | 'priority-chart'
  | 'assignee-chart'
  | 'project-progress'
  | 'recent-activity'
  | 'recent-projects';

export interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
}

const STORAGE_KEY = 'dashboard-layout';

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'stat-cards', label: 'Summary Stats', visible: true },
  { id: 'recently-viewed', label: 'Recently Viewed', visible: true },
  { id: 'status-chart', label: 'Status Breakdown', visible: true },
  { id: 'priority-chart', label: 'Priority Breakdown', visible: true },
  { id: 'assignee-chart', label: 'Assignee Workload', visible: true },
  { id: 'project-progress', label: 'Project Progress', visible: true },
  { id: 'recent-activity', label: 'Recent Activity', visible: true },
  { id: 'recent-projects', label: 'Recent Projects', visible: true },
];

function loadLayout(): WidgetConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(saved) as WidgetConfig[];
    // Merge with defaults to handle new widgets added after saving
    const savedIds = new Set(parsed.map((w) => w.id));
    const merged = [...parsed];
    for (const def of DEFAULT_LAYOUT) {
      if (!savedIds.has(def.id)) merged.push(def);
    }
    return merged;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadLayout);
  const [editing, setEditing] = useState(false);

  const save = useCallback((next: WidgetConfig[]) => {
    setWidgets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const reorder = useCallback((oldIndex: number, newIndex: number) => {
    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleVisibility = useCallback((id: WidgetId) => {
    setWidgets((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    save(DEFAULT_LAYOUT);
  }, [save]);

  return { widgets, editing, setEditing, reorder, toggleVisibility, resetLayout };
}
