import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useWorkspace, useUpdateWorkspace, useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { WorkspaceMembers } from '@/components/settings/WorkspaceMembers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

type Tab = 'general' | 'members';

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'members', label: 'Members' },
];

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace, isLoading } = useWorkspace(workspaceId || '');
  const { data: members } = useWorkspaceMembers(workspaceId || '');
  const updateWorkspace = useUpdateWorkspace();

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
    }
  }, [workspace?.id]); // Only reset when workspace changes

  function handleSave() {
    if (!workspaceId || !name.trim()) return;
    updateWorkspace.mutate({
      id: workspaceId,
      data: { name: name.trim(), description },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-surface-500">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-surface-100">Workspace Settings</h1>

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
              label="Workspace name"
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
                Slug
              </label>
              <div className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-500">
                {workspace.slug}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">
                Logo
              </label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-surface-600 bg-surface-900 text-surface-500 text-xs">
                  {workspace.logoUrl ? (
                    <img
                      src={workspace.logoUrl}
                      alt=""
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    'Logo'
                  )}
                </div>
                <Button size="sm" variant="secondary" disabled>
                  Upload logo
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSave}
              loading={updateWorkspace.isPending}
              disabled={!name.trim()}
            >
              Save changes
            </Button>
          </div>
        )}

        {activeTab === 'members' && workspaceId && members && (
          <WorkspaceMembers workspaceId={workspaceId} members={members} />
        )}
      </div>
    </div>
  );
}
