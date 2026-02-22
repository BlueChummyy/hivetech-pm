import { useState, useEffect, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateWorkspace } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useToast } from '@/components/ui/Toast';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

export function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const createWorkspace = useCreateWorkspace();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const workspace = await createWorkspace.mutateAsync({
        name: name.trim(),
        slug: slugify(name.trim()),
        description: description.trim() || undefined,
      });

      if (workspace?.id) {
        setActiveWorkspace(workspace.id);
      }
      onClose();
      toast({ type: 'success', title: 'Workspace created', description: `"${workspace.name}" is ready.` });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to create workspace',
        description: (err as Error).message || 'Please try again.',
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-workspace-title"
        className={cn(
          'relative z-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-[#18181E] shadow-2xl',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h2 id="create-workspace-title" className="text-lg font-semibold text-white">
            New Workspace
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <Input
            id="workspace-name"
            label="Workspace name"
            placeholder="My Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label htmlFor="workspace-description" className="block text-sm font-medium text-gray-300">
              Description
              <span className="ml-1 text-gray-500">(optional)</span>
            </label>
            <textarea
              id="workspace-description"
              rows={3}
              placeholder="What does your team work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-lg border border-white/[0.08] bg-[#1E1E26] px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createWorkspace.isPending}
              disabled={!name.trim()}
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
