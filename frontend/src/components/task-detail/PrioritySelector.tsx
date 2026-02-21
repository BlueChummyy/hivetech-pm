import { useState, useRef, useEffect } from 'react';
import { Priority } from '@/types/models.types';
import { cn } from '@/utils/cn';

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  [Priority.URGENT]: { label: 'Urgent', color: '#EF4444' },
  [Priority.HIGH]: { label: 'High', color: '#F97316' },
  [Priority.MEDIUM]: { label: 'Medium', color: '#EAB308' },
  [Priority.LOW]: { label: 'Low', color: '#3B82F6' },
  [Priority.NONE]: { label: 'None', color: '#6B7280' },
};

const PRIORITY_ORDER: Priority[] = [
  Priority.URGENT,
  Priority.HIGH,
  Priority.MEDIUM,
  Priority.LOW,
  Priority.NONE,
];

interface PrioritySelectorProps {
  currentPriority: Priority;
  onChange: (priority: Priority) => void;
}

export function PrioritySelector({ currentPriority, onChange }: PrioritySelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = PRIORITY_CONFIG[currentPriority];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 hover:border-surface-600 transition-colors w-full"
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: current.color }}
        />
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[160px] rounded-lg border border-surface-700 bg-surface-800 py-1 shadow-xl">
          {PRIORITY_ORDER.map((priority) => {
            const config = PRIORITY_CONFIG[priority];
            return (
              <button
                key={priority}
                onClick={() => {
                  onChange(priority);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-700',
                  priority === currentPriority
                    ? 'text-surface-100 bg-surface-700/50'
                    : 'text-surface-300',
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
