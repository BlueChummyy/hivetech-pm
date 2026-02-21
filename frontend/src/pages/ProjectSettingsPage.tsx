import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useProjectMembers } from '@/hooks/useMembers';
import { ProjectMembers } from '@/components/settings/ProjectMembers';
import { LabelManager } from '@/components/settings/LabelManager';
import { StatusManager } from '@/components/settings/StatusManager';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageError } from '@/components/ui/PageError';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

type Tab = 'general' | 'members' | 'labels' | 'statuses';

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'members', label: 'Members' },
  { key: 'labels', label: 'Labels' },
  { key: 'statuses', label: 'Statuses' },
];

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-1 border-b border-surface-700 pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-24 w-full max-w-md" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error, refetch } = useProject(projectId || '');
  const { data: members } = useProjectMembers(projectId || '');
  const updateProject = useUpdateProject();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [project?.id]); // Only reset when project changes

  function handleSave() {
    if (!projectId || !name.trim()) return;
    updateProject.mutate(
      { id: projectId, data: { name: name.trim(), description } },
      {
        onSuccess: () => {
          toast({ type: 'success', title: 'Project settings saved' });
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to save settings', description: (err as Error).message });
        },
      },
    );
  }

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (isError) {
    return (
      <PageError
        message={(error as Error)?.message || 'Failed to load project settings'}
        onRetry={refetch}
      />
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-surface-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-surface-100">Project Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-6">
        {activeTab === 'general' && (
          <div className="space-y-4 max-w-md">
            <Input
              label="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-900 hover:border-surface-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">
                Project key
              </label>
              <div className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-500">
                {project.key}
              </div>
            </div>
            <Button
              onClick={handleSave}
              loading={updateProject.isPending}
              disabled={!name.trim()}
            >
              Save changes
            </Button>
          </div>
        )}

        {activeTab === 'members' && projectId && members && (
          <ProjectMembers projectId={projectId} members={members} />
        )}

        {activeTab === 'labels' && projectId && (
          <LabelManager projectId={projectId} />
        )}

        {activeTab === 'statuses' && projectId && (
          <StatusManager projectId={projectId} />
        )}
      </div>
    </div>
  );
}
