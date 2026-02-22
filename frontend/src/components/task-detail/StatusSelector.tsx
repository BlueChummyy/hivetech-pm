import { useState, useRef, useEffect } from 'react';
import type { ProjectStatus } from '@/types/models.types';
import { cn } from '@/utils/cn';

interface StatusSelectorProps {
  statuses: ProjectStatus[];
  currentStatusId: string;
  onChange: (statusId: string) => void;
  disabledCategories?: string[];
}

export function StatusSelector({ statuses, currentStatusId, onChange, disabledCategories = [] }: StatusSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = statuses.find((s) => s.id === currentStatusId);

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
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 hover:border-surface-600 transition-colors w-full"
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: current?.color || '#6B7280' }}
        />
        <span className="truncate">{current?.name || 'Select status'}</span>
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 top-full z-50 mt-1 w-full min-w-[180px] rounded-lg border border-surface-700 bg-surface-800 py-1 shadow-xl">
          {statuses
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((status) => {
              const isDisabled = disabledCategories.includes(status.category);
              return (
                <button
                  key={status.id}
                  role="option"
                  aria-selected={status.id === currentStatusId}
                  aria-disabled={isDisabled || undefined}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(status.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                    isDisabled
                      ? 'text-surface-600 cursor-not-allowed'
                      : status.id === currentStatusId
                        ? 'text-surface-100 bg-surface-700/50 hover:bg-surface-700'
                        : 'text-surface-300 hover:bg-surface-700',
                  )}
                >
                  <span
                    className={cn('h-2.5 w-2.5 rounded-full shrink-0', isDisabled && 'opacity-40')}
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="truncate">{status.name}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
