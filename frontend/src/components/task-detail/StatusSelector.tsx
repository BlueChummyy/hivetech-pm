import { useState, useRef, useEffect } from 'react';
import type { ProjectStatus } from '@/types/models.types';
import { cn } from '@/utils/cn';

interface StatusSelectorProps {
  statuses: ProjectStatus[];
  currentStatusId: string;
  onChange: (statusId: string) => void;
}

export function StatusSelector({ statuses, currentStatusId, onChange }: StatusSelectorProps) {
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
            .map((status) => (
              <button
                key={status.id}
                role="option"
                aria-selected={status.id === currentStatusId}
                onClick={() => {
                  onChange(status.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-700',
                  status.id === currentStatusId
                    ? 'text-surface-100 bg-surface-700/50'
                    : 'text-surface-300',
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                <span className="truncate">{status.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
