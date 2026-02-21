import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-surface-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'block w-full rounded-lg border bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-900',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-surface-700 hover:border-surface-600',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
