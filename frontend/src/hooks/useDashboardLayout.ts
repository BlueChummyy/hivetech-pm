import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

export type WidgetType =
  | 'number'
  | 'donut'
  | 'hbar'
  | 'vbar'
  | 'progress'
  | 'activity'
  | 'recently-viewed'
  | 'projects';

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  title: string;
  colSpan: 1 | 2 | 3;
  visible: boolean;
  config?: {
    chartType?: 'donut' | 'hbar' | 'vbar';
    dataSource?: 'byStatus' | 'byPriority' | 'byAssignee' | 'projectProgress';
    filter?: string;
    color?: string;
    icon?: string;
    maxItems?: number;
  };
}

const DEFAULT_WIDGETS: WidgetInstance[] = [
  { id: 'num-active', type: 'number', title: 'Active Tasks', colSpan: 1, visible: true, config: { filter: 'active', color: 'primary', icon: 'ListChecks' } },
  { id: 'num-progress', type: 'number', title: 'In Progress', colSpan: 1, visible: true, config: { filter: 'in_progress', color: 'blue', icon: 'Activity' } },
  { id: 'num-overdue', type: 'number', title: 'Overdue', colSpan: 1, visible: true, config: { filter: 'overdue', color: 'red', icon: 'AlertTriangle' } },
  { id: 'num-due-week', type: 'number', title: 'Due This Week', colSpan: 1, visible: true, config: { filter: 'due_this_week', color: 'amber', icon: 'CalendarClock' } },
  { id: 'num-completed', type: 'number', title: 'Completed', colSpan: 1, visible: true, config: { filter: 'completed', color: 'emerald', icon: 'CheckSquare' } },
  { id: 'num-unassigned', type: 'number', title: 'Unassigned', colSpan: 1, visible: true, config: { filter: 'unassigned', color: 'surface', icon: 'UserX' } },
  { id: 'donut-status', type: 'donut', title: 'Tasks by Status', colSpan: 2, visible: true, config: { dataSource: 'byStatus' } },
  { id: 'donut-priority', type: 'donut', title: 'Tasks by Priority', colSpan: 2, visible: true, config: { dataSource: 'byPriority' } },
  { id: 'hbar-assignee', type: 'hbar', title: 'Assignee Workload', colSpan: 2, visible: true, config: { dataSource: 'byAssignee' } },
  { id: 'progress-projects', type: 'progress', title: 'Project Progress', colSpan: 2, visible: true },
  { id: 'feed-activity', type: 'activity', title: 'Recent Activity', colSpan: 2, visible: true },
  { id: 'grid-projects', type: 'projects', title: 'Recent Projects', colSpan: 2, visible: true },
];

export const WIDGET_CATALOG: WidgetInstance[] = [
  ...DEFAULT_WIDGETS,
  { id: 'hbar-status', type: 'hbar', title: 'Status Breakdown', colSpan: 2, visible: true, config: { dataSource: 'byStatus' } },
  { id: 'hbar-priority', type: 'hbar', title: 'Priority Breakdown', colSpan: 2, visible: true, config: { dataSource: 'byPriority' } },
  { id: 'vbar-assignee', type: 'vbar', title: 'Assignee Chart', colSpan: 2, visible: true, config: { dataSource: 'byAssignee' } },
  { id: 'vbar-priority', type: 'vbar', title: 'Priority Chart', colSpan: 2, visible: true, config: { dataSource: 'byPriority' } },
  { id: 'vbar-status', type: 'vbar', title: 'Status Chart', colSpan: 2, visible: true, config: { dataSource: 'byStatus' } },
  { id: 'donut-assignee', type: 'donut', title: 'Tasks per Assignee', colSpan: 2, visible: true, config: { dataSource: 'byAssignee' } },
  { id: 'list-recent', type: 'recently-viewed', title: 'Recently Viewed', colSpan: 2, visible: true },
];

function buildKey(userId: string | undefined): string {
  return `dashboard-layout-${userId || 'default'}`;
}

function loadLayout(key: string): WidgetInstance[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(saved) as WidgetInstance[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WIDGETS;
    // Merge: keep saved order/visibility, but ensure all default widgets exist
    const savedIds = new Set(parsed.map((w) => w.id));
    const merged = [...parsed];
    for (const def of DEFAULT_WIDGETS) {
      if (!savedIds.has(def.id)) merged.push(def);
    }
    return merged;
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export function useDashboardLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const keyRef = useRef(buildKey(userId));
  keyRef.current = buildKey(userId);

  const [widgets, setWidgets] = useState<WidgetInstance[]>(() =>
    loadLayout(keyRef.current),
  );
  const [editing, setEditing] = useState(false);

  const save = useCallback((data: WidgetInstance[]) => {
    localStorage.setItem(keyRef.current, JSON.stringify(data));
  }, []);

  const persist = useCallback((next: WidgetInstance[]) => {
    setWidgets(next);
    save(next);
  }, [save]);

  const reorder = useCallback((oldIndex: number, newIndex: number) => {
    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      save(next);
      return next;
    });
  }, [save]);

  const toggleVisibility = useCallback((id: string) => {
    setWidgets((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w,
      );
      save(next);
      return next;
    });
  }, [save]);

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const next = prev.filter((w) => w.id !== id);
      save(next);
      return next;
    });
  }, [save]);

  const addWidget = useCallback((widget: WidgetInstance) => {
    setWidgets((prev) => {
      const next = [...prev, { ...widget, visible: true }];
      save(next);
      return next;
    });
  }, [save]);

  const resetLayout = useCallback(() => {
    persist(DEFAULT_WIDGETS);
  }, [persist]);

  return {
    widgets,
    editing,
    setEditing,
    reorder,
    toggleVisibility,
    removeWidget,
    addWidget,
    resetLayout,
  };
}
