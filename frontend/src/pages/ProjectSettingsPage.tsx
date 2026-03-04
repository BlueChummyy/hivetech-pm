import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useProjectMembers } from '@/hooks/useMembers';
import { useProjectPermissions } from '@/hooks/useProjectRole';
import { ProjectMembers } from '@/components/settings/ProjectMembers';
import { LabelManager } from '@/components/settings/LabelManager';
import { StatusManager } from '@/components/settings/StatusManager';
import { TemplateManager } from '@/components/settings/TemplateManager';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageError } from '@/components/ui/PageError';
import { Card, CardBody } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

type Tab = 'general' | 'members' | 'labels' | 'statuses' | 'templates' | 'automation';

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'members', label: 'Members' },
  { key: 'labels', label: 'Labels' },
  { key: 'statuses', label: 'Statuses' },
  { key: 'templates', label: 'Templates' },
  { key: 'automation', label: 'Automation' },
];

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-1 border-b border-surface-700 pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-8 space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-24 w-full max-w-md" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, error, refetch } = useProject(projectId || '');
  const { data: members } = useProjectMembers(projectId || '');
  const permissions = useProjectPermissions(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [autoArchive, setAutoArchive] = useState(false);
  const [autoArchiveDelay, setAutoArchiveDelay] = useState(0);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setAutoArchive(project.autoArchive ?? false);
      setAutoArchiveDelay(project.autoArchiveDelay ?? 0);
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
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 px-2 sm:px-4 pt-4 sm:pt-6 overflow-y-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-surface-100">Project Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700 -mx-2 px-2 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-x-visible">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px min-h-[44px] sm:min-h-0',
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
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-4 sm:p-6 lg:p-8">
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-lg">
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

            {permissions.canManageProject && (
              <div className="mt-8 border-t border-red-500/20 pt-6">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-surface-200">Delete this project</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      This will permanently delete the project and all its tasks, comments, and data.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="self-start sm:self-auto shrink-0"
                  >
                    Delete Project
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-md">
              <CardBody className="space-y-4">
                <h3 className="text-lg font-semibold text-red-400">Delete Project</h3>
                <p className="text-sm text-surface-400">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-surface-200">{project?.name}</span>?
                  This action cannot be undone. All tasks, comments, attachments, and data will be permanently removed.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleteProject.isPending}
                    onClick={() => {
                      if (!projectId) return;
                      deleteProject.mutate(projectId, {
                        onSuccess: () => {
                          toast({ type: 'success', title: 'Project deleted' });
                          navigate(`/workspaces/${project?.workspaceId}/projects`);
                        },
                        onError: (err) => {
                          toast({ type: 'error', title: 'Failed to delete project', description: (err as Error).message });
                        },
                      });
                    }}
                  >
                    Delete Project
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'members' && projectId && members && project && (
          <ProjectMembers projectId={projectId} workspaceId={project.workspaceId} members={members} />
        )}

        {activeTab === 'labels' && projectId && (
          <LabelManager projectId={projectId} />
        )}

        {activeTab === 'statuses' && projectId && (
          <StatusManager projectId={projectId} />
        )}

        {activeTab === 'templates' && projectId && (
          <TemplateManager projectId={projectId} />
        )}

        {activeTab === 'automation' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Auto-Archive</h3>
              <p className="mt-1 text-sm text-surface-400">
                Automatically archive tasks when they move to a completed or cancelled status.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-900 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-surface-200">Auto-archive completed tasks</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  Tasks moved to a Done or Cancelled status will be archived automatically.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoArchive}
                onClick={() => setAutoArchive(!autoArchive)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900',
                  autoArchive ? 'bg-primary-600' : 'bg-surface-600',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                    autoArchive ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            {autoArchive && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-300">
                  Archive delay
                </label>
                <select
                  value={autoArchiveDelay}
                  onChange={(e) => setAutoArchiveDelay(Number(e.target.value))}
                  className="block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={0}>Immediately</option>
                  <option value={1}>After 1 hour</option>
                  <option value={24}>After 24 hours</option>
                  <option value={168}>After 7 days</option>
                </select>
                <p className="text-xs text-surface-500">
                  How long to wait after a task reaches a completed status before archiving it.
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                if (!projectId) return;
                updateProject.mutate(
                  { id: projectId, data: { autoArchive, autoArchiveDelay } },
                  {
                    onSuccess: () => {
                      toast({ type: 'success', title: 'Automation settings saved' });
                    },
                    onError: (err) => {
                      toast({ type: 'error', title: 'Failed to save settings', description: (err as Error).message });
                    },
                  },
                );
              }}
              loading={updateProject.isPending}
            >
              Save changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
