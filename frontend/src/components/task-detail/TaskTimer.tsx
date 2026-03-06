import { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import { useActiveTimer, useStartTimer, useStopTimer } from '@/hooks/useTimer';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

interface TaskTimerProps {
  taskId: string;
  canEdit: boolean;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TaskTimer({ taskId, canEdit }: TaskTimerProps) {
  const { data: activeTimer } = useActiveTimer();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const { toast } = useToast();

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunningOnThisTask = activeTimer?.taskId === taskId;
  const isRunningOnOtherTask = activeTimer != null && activeTimer.taskId !== taskId;

  useEffect(() => {
    if (isRunningOnThisTask && activeTimer) {
      const startedAt = new Date(activeTimer.startedAt).getTime();

      const tick = () => setElapsed(Date.now() - startedAt);
      tick(); // Set immediately
      intervalRef.current = setInterval(tick, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isRunningOnThisTask, activeTimer]);

  function handleStart() {
    startTimer.mutate(taskId, {
      onError: (err) =>
        toast({ type: 'error', title: 'Failed to start timer', description: (err as Error).message }),
    });
  }

  function handleStop() {
    stopTimer.mutate(taskId, {
      onSuccess: (result) => {
        if (result?.hours && result.hours > 0) {
          toast({ type: 'success', title: 'Time logged', description: `${result.hours.toFixed(2)}h logged` });
        }
      },
      onError: (err) =>
        toast({ type: 'error', title: 'Failed to stop timer', description: (err as Error).message }),
    });
  }

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      {isRunningOnThisTask ? (
        <>
          <button
            onClick={handleStop}
            disabled={stopTimer.isPending}
            className="flex items-center gap-1.5 rounded-md bg-red-600/20 border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50 transition-colors"
            title="Stop timer"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </button>
          <span className="text-xs font-mono text-red-400 tabular-nums animate-pulse">
            {formatElapsed(elapsed)}
          </span>
        </>
      ) : (
        <button
          onClick={handleStart}
          disabled={startTimer.isPending}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
            isRunningOnOtherTask
              ? 'bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600/30'
              : 'bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30',
          )}
          title={isRunningOnOtherTask ? 'Start timer (will stop timer on other task)' : 'Start timer'}
        >
          <Play className="h-3 w-3 fill-current" />
          {isRunningOnOtherTask ? 'Switch timer here' : 'Start Timer'}
        </button>
      )}
    </div>
  );
}
