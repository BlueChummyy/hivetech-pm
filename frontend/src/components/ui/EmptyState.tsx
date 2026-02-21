import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && (
        <div className="mb-4 text-surface-500">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-surface-200">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-surface-400">{description}</p>
      )}
      {action && (
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
