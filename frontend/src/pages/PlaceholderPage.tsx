import { Construction } from 'lucide-react';

export function PlaceholderPage({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Construction className="mb-4 h-12 w-12 text-surface-500" />
      <h2 className="text-lg font-semibold text-surface-200">
        {title || 'Coming soon'}
      </h2>
      <p className="mt-1 text-sm text-surface-400">
        This page is under construction.
      </p>
    </div>
  );
}
