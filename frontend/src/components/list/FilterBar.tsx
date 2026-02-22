import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ProjectStatus, Priority } from '@/types/models.types';

export interface TaskFilterState {
  search: string;
  statusIds: string[];
  priorities: Priority[];
  assigneeIds: string[];
}

interface FilterBarProps {
  filters: TaskFilterState;
  onFiltersChange: (filters: TaskFilterState) => void;
  statuses: ProjectStatus[];
}

interface DropdownProps {
  label: string;
  children: ReactNode;
}

function FilterDropdown({ label, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'flex items-center gap-1 rounded-md border border-white/[0.08] px-3 py-1.5 text-sm transition-colors',
          open
            ? 'border-primary-500/50 text-white'
            : 'text-gray-400 hover:border-white/[0.15] hover:text-gray-300',
        )}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'URGENT' as Priority, label: 'Urgent', color: '#EF4444' },
  { value: 'HIGH' as Priority, label: 'High', color: '#F97316' },
  { value: 'MEDIUM' as Priority, label: 'Medium', color: '#EAB308' },
  { value: 'LOW' as Priority, label: 'Low', color: '#3B82F6' },
  { value: 'NONE' as Priority, label: 'None', color: '#6B7280' },
];

export function FilterBar({ filters, onFiltersChange, statuses }: FilterBarProps) {
  const activeCount =
    filters.statusIds.length + filters.priorities.length + filters.assigneeIds.length;

  const toggleStatus = (statusId: string) => {
    const ids = filters.statusIds.includes(statusId)
      ? filters.statusIds.filter((id) => id !== statusId)
      : [...filters.statusIds, statusId];
    onFiltersChange({ ...filters, statusIds: ids });
  };

  const togglePriority = (priority: Priority) => {
    const pris = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities: pris });
  };

  const clearAll = () => {
    onFiltersChange({ search: '', statusIds: [], priorities: [], assigneeIds: [] });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Search */}
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search tasks..."
          aria-label="Search tasks"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full sm:w-56 rounded-md border border-white/[0.08] bg-[#1E1E26] py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Status filter */}
      <FilterDropdown label="Status">
        {statuses.map((status) => (
          <button
            key={status.id}
            onClick={() => toggleStatus(status.id)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
          >
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border',
                filters.statusIds.includes(status.id)
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-white/[0.15]',
              )}
            >
              {filters.statusIds.includes(status.id) && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            {status.name}
          </button>
        ))}
      </FilterDropdown>

      {/* Priority filter */}
      <FilterDropdown label="Priority">
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            onClick={() => togglePriority(p.value)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
          >
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border',
                filters.priorities.includes(p.value)
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-white/[0.15]',
              )}
            >
              {filters.priorities.includes(p.value) && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            {p.label}
          </button>
        ))}
      </FilterDropdown>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <>
          <div className="h-5 w-px bg-white/[0.08]" />
          {filters.statusIds.map((sid) => {
            const s = statuses.find((st) => st.id === sid);
            return s ? (
              <span
                key={sid}
                className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-gray-300"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
                <button onClick={() => toggleStatus(sid)} aria-label={`Remove ${s.name} filter`} className="ml-0.5 text-gray-500 hover:text-gray-300">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null;
          })}
          {filters.priorities.map((p) => {
            const pi = PRIORITIES.find((pr) => pr.value === p);
            return pi ? (
              <span
                key={p}
                className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-gray-300"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: pi.color }}
                />
                {pi.label}
                <button onClick={() => togglePriority(p)} aria-label={`Remove ${pi.label} filter`} className="ml-0.5 text-gray-500 hover:text-gray-300">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null;
          })}
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}
