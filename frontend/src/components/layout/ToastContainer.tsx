import { useState, useEffect, useCallback } from 'react';
import { X, Bell, CheckCircle2 } from 'lucide-react';
import { onToast, type ToastData } from '@/hooks/useNotificationSocket';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/utils/cn';

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    return onToast((toast) => {
      setToasts(prev => [...prev, toast]);
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleClick = useCallback((toast: ToastData) => {
    if (toast.resourceType === 'task' && toast.resourceId) {
      useUIStore.getState().openTaskPanel(toast.resourceId);
    }
    dismiss(toast.id);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border border-white/[0.08] bg-[#1E1E26] p-4 shadow-xl',
            'animate-in slide-in-from-right-5 duration-200',
            toast.resourceId && 'cursor-pointer hover:bg-[#252530]',
          )}
          onClick={() => toast.resourceId && handleClick(toast)}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <Bell className="h-5 w-5 text-indigo-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{toast.title}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{toast.message}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }}
            className="shrink-0 rounded p-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
