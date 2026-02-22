import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ListChecks } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TaskTableRow } from './TaskTableRow';
import type { Task, ProjectStatus } from '@/types/models.types';

type SortField = 'taskNumber' | 'title' | 'status' | 'priority' | 'assignee' | 'dueDate';

type SortDirection = 'asc' | 'desc';

interface TaskTableProps {
  tasks: Task[];
  statuses: ProjectStatus[];
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

const columns: { key: SortField; label: string; sortable: boolean }[] = [
  { key: 'taskNumber', label: 'ID', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'assignee', label: 'Assignee', sortable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
];

export function TaskTable({ tasks, statuses }: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>('taskNumber');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    const dir = sortDir === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortField) {
        case 'taskNumber':
          return dir * (a.taskNumber - b.taskNumber);
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'status': {
          const sa = statuses.find((s) => s.id === a.statusId);
          const sb = statuses.find((s) => s.id === b.statusId);
          return dir * ((sa?.position ?? 0) - (sb?.position ?? 0));
        }
        case 'priority':
          return dir * ((PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));
        case 'assignee': {
          const na = a.assignee?.name || a.assignee?.displayName || '';
          const nb = b.assignee?.name || b.assignee?.displayName || '';
          return dir * na.localeCompare(nb);
        }
        case 'dueDate': {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dir * (da - db);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [tasks, sortField, sortDir, statuses]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-xl bg-white/[0.04] p-4">
          <ListChecks className="h-10 w-10 text-gray-500" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white">No tasks found</h3>
        <p className="mt-1 text-sm text-gray-400">
          Create a task or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.08] bg-[#14141A]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  col.sortable && sortField === col.key
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                className={cn(
                  'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-300',
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable &&
                    (sortField === col.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" aria-hidden="true" />
                    ))}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => (
            <TaskTableRow key={task.id} task={task} statuses={statuses} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
