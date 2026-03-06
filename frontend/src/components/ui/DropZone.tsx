import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function DropZone({ onFilesDropped, children, disabled, className }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCountRef.current++;
      if (e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current--;
      if (dragCountRef.current === 0) {
        setIsDragging(false);
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDropped(files);
      }
    },
    [disabled, onFilesDropped],
  );

  return (
    <div
      className={cn('relative', className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && !disabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary-400 bg-primary-500/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary-400">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Drop files to attach</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface AttachmentDropAreaProps {
  onFilesDropped: (files: File[]) => void;
  hasAttachments: boolean;
  disabled?: boolean;
}

export function AttachmentDropArea({ onFilesDropped, hasAttachments, disabled }: AttachmentDropAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCountRef.current++;
      if (e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current--;
      if (dragCountRef.current === 0) {
        setIsDragging(false);
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDropped(files);
      }
    },
    [disabled, onFilesDropped],
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesDropped(files);
    }
    e.target.value = '';
  }

  if (disabled) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed transition-colors cursor-pointer',
        isDragging
          ? 'border-primary-400 bg-primary-500/10'
          : 'border-surface-600 hover:border-surface-500 hover:bg-surface-900/50',
        hasAttachments ? 'px-3 py-2' : 'px-4 py-6',
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className={cn(
        'flex items-center gap-2 text-surface-500',
        hasAttachments ? 'justify-center' : 'flex-col justify-center',
      )}>
        <Upload className={cn(hasAttachments ? 'h-3.5 w-3.5' : 'h-6 w-6')} />
        <span className={cn(hasAttachments ? 'text-xs' : 'text-sm')}>
          {hasAttachments ? 'Drop more files or click to upload' : 'Drag & drop files here or click to upload'}
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
