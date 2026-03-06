import { useState, useEffect, useRef } from 'react';
import { Clock, Square } from 'lucide-react';
import { useActiveTimer, useStopTimer } from '@/hooks/useTimer';
import { useUIStore } from '@/store/ui.store';
import { useToast } from '@/components/ui/Toast';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function GlobalTimer() {
  const { data: activeTimer } = useActiveTimer();
  const stopTimer = useStopTimer();
  const { toast } = useToast();
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTimer) {
      const startedAt = new Date(activeTimer.startedAt).getTime();

      const tick = () => setElapsed(Date.now() - startedAt);
      tick();
      intervalRef.current = setInterval(tick, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [activeTimer]);

  if (!activeTimer) return null;

  function handleStop() {
    if (!activeTimer) return;
    stopTimer.mutate(activeTimer.taskId, {
      onSuccess: (result) => {
        if (result?.hours && result.hours > 0) {
          toast({ type: 'success', title: 'Time logged', description: `${result.hours.toFixed(2)}h logged` });
        }
      },
      onError: (err) =>
        toast({ type: 'error', title: 'Failed to stop timer', description: (err as Error).message }),
    });
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-red-600/15 border border-red-500/25 px-2 py-1">
      <Clock className="h-3.5 w-3.5 text-red-400 animate-pulse" />
      <button
        onClick={() => openTaskPanel(activeTimer.taskId)}
        className="text-xs text-red-300 hover:text-red-200 truncate max-w-[120px] transition-colors"
        title={activeTimer.task?.title || 'View task'}
      >
        {activeTimer.task?.title
          ? `#${activeTimer.task.taskNumber} ${activeTimer.task.title}`
          : 'Timer running'}
      </button>
      <span className="text-xs font-mono text-red-400 tabular-nums">
        {formatElapsed(elapsed)}
      </span>
      <button
        onClick={handleStop}
        disabled={stopTimer.isPending}
        className="rounded p-0.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
        title="Stop timer"
      >
        <Square className="h-3 w-3 fill-current" />
      </button>
    </div>
  );
}
