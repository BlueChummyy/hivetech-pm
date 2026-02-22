import { cn } from '@/utils/cn';
import type { Priority, StatusCategory } from '@/types/models.types';

type BadgeVariant = 'filled' | 'dot';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: BadgeVariant;
  className?: string;
}

const priorityColors: Record<Priority, string> = {
  URGENT: 'bg-red-500/15 text-red-400 border-red-500/20',
  HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  LOW: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  NONE: 'bg-surface-500/15 text-surface-400 border-surface-500/20',
};

const statusCategoryColors: Record<StatusCategory, string> = {
  NOT_STARTED: 'bg-surface-500/15 text-surface-400',
  ACTIVE: 'bg-amber-500/15 text-amber-400',
  DONE: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

const dotColors: Record<StatusCategory, string> = {
  NOT_STARTED: 'bg-surface-400',
  ACTIVE: 'bg-amber-400',
  DONE: 'bg-emerald-400',
  CANCELLED: 'bg-red-400',
};

export function Badge({ children, color, variant = 'filled', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium',
        color || 'bg-surface-700 text-surface-300',
        className,
      )}
    >
      {variant === 'dot' && (
        <span className={cn('h-1.5 w-1.5 rounded-full', color || 'bg-surface-400')} />
      )}
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge color={priorityColors[priority]}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </Badge>
  );
}

export function StatusBadge({
  category,
  children,
}: {
  category: StatusCategory;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium',
        statusCategoryColors[category],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[category])} />
      {children}
    </span>
  );
}
