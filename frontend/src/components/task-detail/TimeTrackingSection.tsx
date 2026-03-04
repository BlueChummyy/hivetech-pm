import { useState } from 'react';
import { Clock, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useTimeEntries, useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '@/hooks/useTimeEntries';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';

interface TimeTrackingSectionProps {
  taskId: string;
  estimatedHours: number | null;
  canEdit: boolean;
}

export function TimeTrackingSection({ taskId, estimatedHours, canEdit }: TimeTrackingSectionProps) {
  const { data, isLoading } = useTimeEntries(taskId);
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');

  const entries = data?.entries ?? [];
  const totalHours = data?.totalHours ?? 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = parseFloat(hours);
    if (!h || h <= 0) return;

    createEntry.mutate(
      {
        taskId,
        data: {
          hours: h,
          description: description.trim() || undefined,
          date,
        },
      },
      {
        onSuccess: () => {
          setHours('');
          setDescription('');
          setDate(format(new Date(), 'yyyy-MM-dd'));
          setShowForm(false);
        },
        onError: (err) =>
          toast({ type: 'error', title: 'Failed to log time', description: (err as Error).message }),
      },
    );
  }

  function startEdit(entry: { id: string; hours: number; description: string | null; date: string }) {
    setEditingId(entry.id);
    setEditHours(String(entry.hours));
    setEditDescription(entry.description || '');
    setEditDate(typeof entry.date === 'string' ? entry.date.split('T')[0] : format(new Date(entry.date), 'yyyy-MM-dd'));
  }

  function handleUpdate(entryId: string) {
    const h = parseFloat(editHours);
    if (!h || h <= 0) return;

    updateEntry.mutate(
      {
        taskId,
        entryId,
        data: {
          hours: h,
          description: editDescription.trim() || undefined,
          date: editDate,
        },
      },
      {
        onSuccess: () => setEditingId(null),
        onError: (err) =>
          toast({ type: 'error', title: 'Failed to update time entry', description: (err as Error).message }),
      },
    );
  }

  function handleDelete(entryId: string) {
    deleteEntry.mutate(
      { taskId, entryId },
      {
        onError: (err) =>
          toast({ type: 'error', title: 'Failed to delete time entry', description: (err as Error).message }),
      },
    );
  }

  const progressPercent = estimatedHours && estimatedHours > 0 ? Math.min((totalHours / estimatedHours) * 100, 100) : 0;
  const isOverEstimate = estimatedHours != null && estimatedHours > 0 && totalHours > estimatedHours;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Time Tracking
        </h4>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Log time
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="rounded-lg border border-surface-700 bg-surface-900 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-surface-400">
            Logged: <span className={cn('font-medium', isOverEstimate ? 'text-red-400' : 'text-surface-200')}>{totalHours.toFixed(1)}h</span>
          </span>
          {estimatedHours != null && estimatedHours > 0 && (
            <span className="text-surface-400">
              Estimated: <span className="font-medium text-surface-200">{estimatedHours}h</span>
            </span>
          )}
        </div>
        {estimatedHours != null && estimatedHours > 0 && (
          <div className="h-1.5 w-full rounded-full bg-surface-700 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isOverEstimate ? 'bg-red-500' : 'bg-primary-500',
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Log time form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-surface-700 bg-surface-900 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Hours"
              required
              className="w-20 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
            />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={500}
            className="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-2 py-1 text-xs text-surface-400 hover:text-surface-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEntry.isPending}
              className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
            >
              {createEntry.isPending ? 'Saving...' : 'Log'}
            </button>
          </div>
        </form>
      )}

      {/* Time entries list */}
      {isLoading ? (
        <p className="text-xs text-surface-500">Loading...</p>
      ) : entries.length > 0 ? (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 rounded-md bg-surface-900 px-3 py-2">
              {editingId === entry.id ? (
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="24"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="w-20 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
                    />
                    <button
                      onClick={() => handleUpdate(entry.id)}
                      className="rounded-md p-1 text-green-400 hover:bg-green-500/10"
                      title="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md p-1 text-surface-400 hover:text-surface-200"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    maxLength={500}
                    className="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              ) : (
                <>
                  {entry.user && (
                    <Avatar
                      src={entry.user.avatarUrl}
                      name={entry.user.name || entry.user.displayName}
                      size="sm"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-surface-200">{Number(entry.hours).toFixed(1)}h</span>
                      <span className="text-[10px] text-surface-500">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </span>
                      {entry.user && (
                        <span className="text-[10px] text-surface-500">
                          {entry.user.name || entry.user.displayName}
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-xs text-surface-400 truncate">{entry.description}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => startEdit(entry)}
                        className="rounded-md p-1 text-surface-400 hover:text-surface-200"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-md p-1 text-surface-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-surface-500">No time logged yet</p>
      )}
    </div>
  );
}
