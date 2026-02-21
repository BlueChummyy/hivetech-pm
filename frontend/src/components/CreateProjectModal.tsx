import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateProject } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/Toast';

interface CreateProjectModalProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

function generateKey(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 10);
}

export function CreateProjectModal({ workspaceId, open, onClose }: CreateProjectModalProps) {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    if (!keyTouched && name) {
      setKey(generateKey(name));
    }
  }, [name, keyTouched]);

  useEffect(() => {
    if (!open) {
      setName('');
      setKey('');
      setKeyTouched(false);
      setDescription('');
      setKeyError('');
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

  const validateKey = useCallback((value: string) => {
    if (!/^[A-Z0-9]+$/.test(value)) {
      setKeyError('Key must contain only uppercase letters and numbers');
      return false;
    }
    if (value.length > 10) {
      setKeyError('Key must be 10 characters or less');
      return false;
    }
    setKeyError('');
    return true;
  }, []);

  const handleKeyChange = (value: string) => {
    const upper = value.toUpperCase().slice(0, 10);
    setKey(upper);
    setKeyTouched(true);
    if (upper) validateKey(upper);
    else setKeyError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;
    if (!validateKey(key)) return;

    try {
      const project = await createProject.mutateAsync({
        workspaceId,
        name: name.trim(),
        key,
        description: description.trim() || undefined,
      });

      onClose();
      if (project?.id) {
        navigate(`/projects/${project.id}/board`);
      }
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to create project',
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
        aria-labelledby="create-project-title"
        className={cn(
          'relative z-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-[#18181E] shadow-2xl',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h2 id="create-project-title" className="text-lg font-semibold text-white">New Project</h2>
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
            id="project-name"
            label="Project name"
            placeholder="My Awesome Project"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            id="project-key"
            label="Key"
            placeholder="MAP"
            value={key}
            onChange={(e) => handleKeyChange(e.target.value)}
            error={keyError}
            required
          />

          <div className="space-y-1.5">
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-gray-300"
            >
              Description
            </label>
            <textarea
              id="project-description"
              rows={3}
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-lg border border-white/[0.08] bg-[#1E1E26] px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createProject.isPending}
              disabled={!name.trim() || !key.trim() || !!keyError}
            >
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
