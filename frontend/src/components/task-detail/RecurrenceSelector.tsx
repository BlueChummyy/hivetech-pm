import { useState, useEffect, useRef } from 'react';
import { Repeat, ChevronDown, X } from 'lucide-react';
import { useUpdateRecurrence } from '@/hooks/useTasks';
import { useToast } from '@/components/ui/Toast';

const FREQUENCY_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

const DAYS_OF_WEEK = [
  { value: 'MON', label: 'M' },
  { value: 'TUE', label: 'T' },
  { value: 'WED', label: 'W' },
  { value: 'THU', label: 'T' },
  { value: 'FRI', label: 'F' },
  { value: 'SAT', label: 'S' },
  { value: 'SUN', label: 'S' },
] as const;

interface RecurrenceSelectorProps {
  taskId: string;
  recurrenceRule: string | null;
  recurrenceInterval: number;
  recurrenceDays: string[];
  recurrenceEndDate: string | null;
  nextRecurrence: string | null;
  canEdit: boolean;
}

export function RecurrenceSelector({
  taskId,
  recurrenceRule,
  recurrenceInterval,
  recurrenceDays,
  recurrenceEndDate,
  nextRecurrence,
  canEdit,
}: RecurrenceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [rule, setRule] = useState<string | null>(recurrenceRule);
  const [interval, setInterval] = useState(recurrenceInterval || 1);
  const [days, setDays] = useState<string[]>(recurrenceDays || []);
  const [endDate, setEndDate] = useState(recurrenceEndDate ? recurrenceEndDate.split('T')[0] : '');
  const ref = useRef<HTMLDivElement>(null);
  const updateRecurrence = useUpdateRecurrence();
  const { toast } = useToast();

  useEffect(() => {
    setRule(recurrenceRule);
    setInterval(recurrenceInterval || 1);
    setDays(recurrenceDays || []);
    setEndDate(recurrenceEndDate ? recurrenceEndDate.split('T')[0] : '');
  }, [recurrenceRule, recurrenceInterval, JSON.stringify(recurrenceDays), recurrenceEndDate]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  function handleSave() {
    updateRecurrence.mutate(
      {
        id: taskId,
        data: {
          recurrenceRule: rule,
          recurrenceInterval: interval,
          recurrenceDays: rule === 'WEEKLY' ? days : [],
          recurrenceEndDate: endDate ? `${endDate}T23:59:59.000Z` : null,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast({ type: 'success', title: 'Recurrence updated' });
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to update recurrence', description: (err as Error).message });
        },
      },
    );
  }

  function handleRemove() {
    updateRecurrence.mutate(
      {
        id: taskId,
        data: {
          recurrenceRule: null,
          recurrenceInterval: 1,
          recurrenceDays: [],
          recurrenceEndDate: null,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast({ type: 'success', title: 'Recurrence removed' });
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to remove recurrence', description: (err as Error).message });
        },
      },
    );
  }

  function toggleDay(day: string) {
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  function getDisplayLabel(): string {
    if (!recurrenceRule) return 'None';
    if (recurrenceRule === 'DAILY') return recurrenceInterval === 1 ? 'Daily' : `Every ${recurrenceInterval} days`;
    if (recurrenceRule === 'WEEKLY') {
      const dayStr = recurrenceDays.length > 0 ? ` (${recurrenceDays.join(', ')})` : '';
      return recurrenceInterval === 1 ? `Weekly${dayStr}` : `Every ${recurrenceInterval} weeks${dayStr}`;
    }
    if (recurrenceRule === 'MONTHLY') return recurrenceInterval === 1 ? 'Monthly' : `Every ${recurrenceInterval} months`;
    if (recurrenceRule === 'CUSTOM') return `Every ${recurrenceInterval} days`;
    return recurrenceRule;
  }

  if (!canEdit) {
    return (
      <span className="text-sm text-surface-300">
        {recurrenceRule ? (
          <span className="flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5 text-primary-400" />
            {getDisplayLabel()}
          </span>
        ) : (
          'None'
        )}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
      >
        {recurrenceRule && <Repeat className="h-3.5 w-3.5 text-primary-400" />}
        <span>{getDisplayLabel()}</span>
        <ChevronDown className="h-3 w-3 text-surface-500" />
      </button>

      {open && (
        <div
          className="z-50 w-72 rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-xl"
          style={{ position: 'fixed', left: ref.current?.getBoundingClientRect().left ?? 0, top: (ref.current?.getBoundingClientRect().bottom ?? 0) + 6 }}
        >
          {/* Frequency selector */}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">Frequency</label>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRule(opt.value);
                      if (opt.value === null) {
                        setInterval(1);
                        setDays([]);
                        setEndDate('');
                      }
                    }}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      rule === opt.value
                        ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/40'
                        : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval (for non-None rules) */}
            {rule && (
              <div>
                <label className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">
                  Every
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={interval}
                    onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded-md border border-surface-700 bg-surface-900 px-2 py-1 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-xs text-surface-400">
                    {rule === 'DAILY' || rule === 'CUSTOM' ? 'day(s)' : rule === 'WEEKLY' ? 'week(s)' : 'month(s)'}
                  </span>
                </div>
              </div>
            )}

            {/* Day-of-week checkboxes (for WEEKLY) */}
            {rule === 'WEEKLY' && (
              <div>
                <label className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">Days</label>
                <div className="mt-2 flex gap-1">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleDay(d.value);
                      }}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        days.includes(d.value)
                          ? 'bg-primary-500 text-white'
                          : 'bg-surface-700 text-surface-400 hover:bg-surface-600'
                      }`}
                      title={d.value}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* End date (optional) */}
            {rule && (
              <div>
                <label className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">End date (optional)</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 rounded-md border border-surface-700 bg-surface-900 px-2 py-1 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
                  />
                  {endDate && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEndDate('');
                      }}
                      className="text-surface-500 hover:text-surface-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Next recurrence display */}
            {nextRecurrence && (
              <div className="text-[11px] text-surface-500">
                Next: {new Date(nextRecurrence).toLocaleDateString()}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between border-t border-surface-700 pt-3 mt-1">
              {recurrenceRule && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  className="rounded-md px-3 py-1 text-xs text-surface-400 hover:bg-surface-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSave();
                  }}
                  className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
