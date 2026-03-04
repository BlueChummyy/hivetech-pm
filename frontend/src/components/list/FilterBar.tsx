import { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  ChevronDown,
  Filter,
  CircleDot,
  Users,
  Flag,
  Tag,
  Calendar,
  Trash2,
  Check,
  ArrowUp,
  ArrowDown,
  Archive,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ProjectStatus, Priority, ProjectMember, Label } from '@/types/models.types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GroupByConfig {
  field: 'status' | 'assignee' | 'priority' | 'label' | 'dueDate' | 'none';
  direction: 'asc' | 'desc';
  enabled: boolean;
}

export interface TaskFilterState {
  search: string;
  statusIds: string[];
  priorities: Priority[];
  assigneeIds: string[];
  labelIds: string[];
  showClosed: boolean;
  groupBy: GroupByConfig;
}

interface FilterBarProps {
  filters: TaskFilterState;
  onFiltersChange: (filters: TaskFilterState) => void;
  statuses: ProjectStatus[];
  members?: ProjectMember[];
  labels?: Label[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'URGENT' as Priority, label: 'Urgent', color: '#EF4444' },
  { value: 'HIGH' as Priority, label: 'High', color: '#F97316' },
  { value: 'MEDIUM' as Priority, label: 'Medium', color: '#EAB308' },
  { value: 'LOW' as Priority, label: 'Low', color: '#3B82F6' },
  { value: 'NONE' as Priority, label: 'None', color: '#6B7280' },
];

const GROUP_BY_OPTIONS: {
  value: GroupByConfig['field'];
  label: string;
  icon: typeof CircleDot;
}[] = [
  { value: 'status', label: 'Status', icon: CircleDot },
  { value: 'assignee', label: 'Assignee', icon: Users },
  { value: 'priority', label: 'Priority', icon: Flag },
  { value: 'label', label: 'Labels', icon: Tag },
  { value: 'dueDate', label: 'Due Date', icon: Calendar },
];

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded border shrink-0',
        checked ? 'border-primary-500 bg-primary-500' : 'border-white/[0.15]',
      )}
    >
      {checked && (
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
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-label={checked ? 'Disable grouping' : 'Enable grouping'}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
        checked ? 'bg-primary-600' : 'bg-white/[0.1]',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Position the menu as fixed relative to the trigger button
  const positionMenu = (el: HTMLDivElement | null) => {
    menuRef.current = el;
    if (!el || !ref.current) return;
    const btn = ref.current.getBoundingClientRect();
    el.style.position = 'fixed';
    el.style.left = `${btn.left}px`;
    el.style.top = `${btn.bottom + 4}px`;
  };

  return { open, setOpen, ref, positionMenu };
}

/* ------------------------------------------------------------------ */
/*  FilterBar                                                          */
/* ------------------------------------------------------------------ */

export function FilterBar({
  filters,
  onFiltersChange,
  statuses,
  members,
  labels,
}: FilterBarProps) {
  const filterDD = useDropdown();
  const groupByDD = useDropdown();
  const directionDD = useDropdown();

  const activeFilterCount =
    filters.statusIds.length +
    filters.priorities.length +
    filters.assigneeIds.length +
    filters.labelIds.length;

  /* ---- toggle helpers ---- */

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

  const toggleAssignee = (userId: string) => {
    const ids = filters.assigneeIds.includes(userId)
      ? filters.assigneeIds.filter((id) => id !== userId)
      : [...filters.assigneeIds, userId];
    onFiltersChange({ ...filters, assigneeIds: ids });
  };

  const toggleLabel = (labelId: string) => {
    const ids = filters.labelIds.includes(labelId)
      ? filters.labelIds.filter((id) => id !== labelId)
      : [...filters.labelIds, labelId];
    onFiltersChange({ ...filters, labelIds: ids });
  };

  /* ---- group-by helpers ---- */

  const setGroupByField = (field: GroupByConfig['field']) => {
    onFiltersChange({
      ...filters,
      groupBy: {
        ...filters.groupBy,
        field,
        enabled: field !== 'none',
      },
    });
    groupByDD.setOpen(false);
  };

  const setGroupByDirection = (direction: 'asc' | 'desc') => {
    onFiltersChange({
      ...filters,
      groupBy: { ...filters.groupBy, direction },
    });
    directionDD.setOpen(false);
  };

  const clearGroupBy = () => {
    onFiltersChange({
      ...filters,
      groupBy: { field: 'none', direction: 'asc', enabled: false },
    });
  };

  const toggleGroupByEnabled = (enabled: boolean) => {
    onFiltersChange({
      ...filters,
      groupBy: { ...filters.groupBy, enabled },
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      ...filters,
      search: '',
      statusIds: [],
      priorities: [],
      assigneeIds: [],
      labelIds: [],
    });
  };

  const selectedGroupOption = GROUP_BY_OPTIONS.find(
    (o) => o.value === filters.groupBy.field,
  );

  return (
    <div className="space-y-2">
      {/* ---- Main bar ---- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search tasks..."
            aria-label="Search tasks"
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="w-full sm:w-48 rounded-md border border-white/[0.08] bg-[#1E1E26] py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* ---- Unified filter dropdown ---- */}
        <div className="relative" ref={filterDD.ref}>
          <button
            onClick={() => filterDD.setOpen(!filterDD.open)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-white/[0.08] px-3 py-1.5 text-sm transition-colors',
              filterDD.open
                ? 'border-primary-500/50 text-white'
                : 'text-gray-400 hover:border-white/[0.15] hover:text-gray-300',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-medium text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {filterDD.open && (
            <div ref={filterDD.positionMenu} className="fixed z-50 w-[260px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl max-h-[400px] overflow-y-auto">
              {/* Status */}
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Status
              </div>
              {statuses.map((status) => (
                <button
                  key={status.id}
                  onClick={() => toggleStatus(status.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
                >
                  <Checkbox checked={filters.statusIds.includes(status.id)} />
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="truncate">{status.name}</span>
                </button>
              ))}

              <div className="my-1 border-t border-white/[0.06]" />

              {/* Priority */}
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Priority
              </div>
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => togglePriority(p.value)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
                >
                  <Checkbox checked={filters.priorities.includes(p.value)} />
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate">{p.label}</span>
                </button>
              ))}

              {/* Assignee */}
              {members && members.length > 0 && (
                <>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Assignee
                  </div>
                  {members.map((m) => {
                    const user = m.user;
                    if (!user) return null;
                    const displayName =
                      user.name || user.displayName || user.email;
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleAssignee(user.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
                      >
                        <Checkbox
                          checked={filters.assigneeIds.includes(user.id)}
                        />
                        <span className="truncate">{displayName}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Labels */}
              {labels && labels.length > 0 && (
                <>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Labels
                  </div>
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
                    >
                      <Checkbox
                        checked={filters.labelIds.includes(label.id)}
                      />
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="truncate">{label.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ---- Show Closed toggle ---- */}
        <button
          onClick={() => onFiltersChange({ ...filters, showClosed: !filters.showClosed })}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
            filters.showClosed
              ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
              : 'border-white/[0.08] text-gray-400 hover:border-white/[0.15] hover:text-gray-300',
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          Closed
        </button>

        {/* ---- Divider ---- */}
        <div className="hidden sm:block h-5 w-px bg-white/[0.08]" />

        {/* ---- Group By dropdown ---- */}
        <div className="relative" ref={groupByDD.ref}>
          <button
            onClick={() => groupByDD.setOpen(!groupByDD.open)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-white/[0.08] px-3 py-1.5 text-sm transition-colors',
              groupByDD.open
                ? 'border-primary-500/50 text-white'
                : 'text-gray-400 hover:border-white/[0.15] hover:text-gray-300',
            )}
          >
            {selectedGroupOption ? (
              <>
                <selectedGroupOption.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Group:</span>{' '}
                {selectedGroupOption.label}
              </>
            ) : (
              <>Group by</>
            )}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {groupByDD.open && (
            <div ref={groupByDD.positionMenu} className="fixed z-50 min-w-[180px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
              {GROUP_BY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = filters.groupBy.field === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setGroupByField(option.value)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.04]',
                      isSelected ? 'text-white' : 'text-gray-300',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{option.label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- Direction dropdown (only when group selected) ---- */}
        {filters.groupBy.field !== 'none' && (
          <div className="relative" ref={directionDD.ref}>
            <button
              onClick={() => directionDD.setOpen(!directionDD.open)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border border-white/[0.08] px-3 py-1.5 text-sm transition-colors',
                directionDD.open
                  ? 'border-primary-500/50 text-white'
                  : 'text-gray-400 hover:border-white/[0.15] hover:text-gray-300',
              )}
            >
              {filters.groupBy.direction === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {filters.groupBy.direction === 'asc'
                  ? 'Ascending'
                  : 'Descending'}
              </span>
            </button>

            {directionDD.open && (
              <div ref={directionDD.positionMenu} className="fixed z-50 min-w-[150px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
                <button
                  onClick={() => setGroupByDirection('asc')}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/[0.04]',
                    filters.groupBy.direction === 'asc'
                      ? 'text-white'
                      : 'text-gray-300',
                  )}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Ascending
                  {filters.groupBy.direction === 'asc' && (
                    <Check className="h-3.5 w-3.5 ml-auto text-primary-400" />
                  )}
                </button>
                <button
                  onClick={() => setGroupByDirection('desc')}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/[0.04]',
                    filters.groupBy.direction === 'desc'
                      ? 'text-white'
                      : 'text-gray-300',
                  )}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Descending
                  {filters.groupBy.direction === 'desc' && (
                    <Check className="h-3.5 w-3.5 ml-auto text-primary-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- Clear grouping (trash) ---- */}
        {filters.groupBy.field !== 'none' && (
          <button
            onClick={clearGroupBy}
            aria-label="Clear grouping"
            className="rounded-md border border-white/[0.08] p-1.5 text-gray-400 transition-colors hover:border-white/[0.15] hover:text-gray-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* ---- Enable / disable toggle ---- */}
        {filters.groupBy.field !== 'none' && (
          <ToggleSwitch
            checked={filters.groupBy.enabled}
            onChange={toggleGroupByEnabled}
          />
        )}
      </div>

      {/* ---- Active filter chips ---- */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
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
                <button
                  onClick={() => toggleStatus(sid)}
                  aria-label={`Remove ${s.name} filter`}
                  className="ml-0.5 text-gray-500 hover:text-gray-300"
                >
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
                <button
                  onClick={() => togglePriority(p)}
                  aria-label={`Remove ${pi.label} filter`}
                  className="ml-0.5 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null;
          })}

          {filters.assigneeIds.map((uid) => {
            const m = members?.find((mem) => mem.user?.id === uid);
            const displayName =
              m?.user?.name || m?.user?.displayName || m?.user?.email || uid;
            return (
              <span
                key={uid}
                className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-gray-300"
              >
                {displayName}
                <button
                  onClick={() => toggleAssignee(uid)}
                  aria-label={`Remove ${displayName} filter`}
                  className="ml-0.5 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {filters.labelIds.map((lid) => {
            const l = labels?.find((lb) => lb.id === lid);
            return l ? (
              <span
                key={lid}
                className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-gray-300"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                {l.name}
                <button
                  onClick={() => toggleLabel(lid)}
                  aria-label={`Remove ${l.name} filter`}
                  className="ml-0.5 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null;
          })}

          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
