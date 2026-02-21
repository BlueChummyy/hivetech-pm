import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  className?: string;
  children: ReactNode;
}

interface CardHeaderProps {
  className?: string;
  children: ReactNode;
}

interface CardBodyProps {
  className?: string;
  children: ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-surface-700 bg-surface-800 shadow-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'border-b border-surface-700 px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children }: CardBodyProps) {
  return (
    <div className={cn('px-6 py-4', className)}>{children}</div>
  );
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div
      className={cn(
        'border-t border-surface-700 px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
