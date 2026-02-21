import { AlertCircle, RefreshCw } from 'lucide-react';

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({ message = 'Failed to load data', onRetry }: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="rounded-full bg-red-500/10 p-3">
        <AlertCircle className="h-6 w-6 text-red-400" />
      </div>
      <p className="text-sm text-gray-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#1E1E26] px-3 py-1.5 text-sm text-gray-300 hover:bg-[#252530] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
