import type { Task } from '@/types/models.types';
import { Priority } from '@/types/models.types';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/utils/cn';

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.URGENT]: '#EF4444',
  [Priority.HIGH]: '#F97316',
  [Priority.MEDIUM]: '#EAB308',
  [Priority.LOW]: '#3B82F6',
  [Priority.NONE]: '#6366F1',
};

interface GanttBarProps {
  task: Task;
  left: number;
  width: number;
  rowHeight: number;
}

export function GanttBar({ task, left, width, rowHeight }: GanttBarProps) {
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);
  const barColor = task.status?.color || PRIORITY_COLORS[task.priority] || '#6366F1';

  return (
    <button
      onClick={() => openTaskPanel(task.id)}
      className="absolute flex items-center rounded-md px-2 text-xs font-medium text-white truncate transition-opacity hover:opacity-90 cursor-pointer"
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 24)}px`,
        height: `${rowHeight - 12}px`,
        top: '6px',
        backgroundColor: barColor,
      }}
      title={task.title}
    >
      <span className="truncate">{task.title}</span>
    </button>
  );
}
