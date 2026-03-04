import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspace, useUpdateWorkspace, useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useBranding, useUpdateBranding, useUploadLogo, useUploadFavicon } from '@/hooks/useBranding';
import { WorkspaceMembers } from '@/components/settings/WorkspaceMembers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageError } from '@/components/ui/PageError';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';
import { Upload } from 'lucide-react';

type Tab = 'general' | 'members' | 'branding';

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'members', label: 'Members' },
  { key: 'branding', label: 'Branding' },
];

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-8 w-52" />
      <div className="flex gap-1 border-b border-surface-700 pb-1">
        {[1, 2].map((i) => (
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

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace, isLoading, isError, error, refetch } = useWorkspace(workspaceId || '');
  const { data: members } = useWorkspaceMembers(workspaceId || '');
  const updateWorkspace = useUpdateWorkspace();
  const { toast } = useToast();

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
    updateWorkspace.mutate(
      {
        id: workspaceId,
        data: { name: name.trim(), description },
      },
      {
        onSuccess: () => {
          toast({ type: 'success', title: 'Workspace settings saved' });
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
        message={(error as Error)?.message || 'Failed to load workspace settings'}
        onRetry={refetch}
      />
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

        {activeTab === 'branding' && workspaceId && (
          <BrandingSettings workspaceId={workspaceId} />
        )}
      </div>
    </div>
  );
}

function BrandingSettings({ workspaceId }: { workspaceId: string }) {
  const { data: branding } = useBranding(workspaceId);
  const updateBranding = useUpdateBranding();
  const uploadLogo = useUploadLogo();
  const uploadFavicon = useUploadFavicon();
  const { toast } = useToast();

  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding) {
      setOrgName(branding.orgName || '');
      setPrimaryColor(branding.primaryColor || '#6366F1');
    }
  }, [branding?.id]);

  const apiBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';

  function handleSave() {
    updateBranding.mutate(
      { workspaceId, data: { orgName: orgName.trim(), primaryColor } },
      {
        onSuccess: () => toast({ type: 'success', title: 'Branding settings saved' }),
        onError: (err) => toast({ type: 'error', title: 'Failed to save', description: (err as Error).message }),
      },
    );
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadLogo.mutate(
      { workspaceId, file },
      {
        onSuccess: () => toast({ type: 'success', title: 'Logo uploaded' }),
        onError: (err) => toast({ type: 'error', title: 'Upload failed', description: (err as Error).message }),
      },
    );
    e.target.value = '';
  }

  function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFavicon.mutate(
      { workspaceId, file },
      {
        onSuccess: () => toast({ type: 'success', title: 'Favicon uploaded' }),
        onError: (err) => toast({ type: 'error', title: 'Upload failed', description: (err as Error).message }),
      },
    );
    e.target.value = '';
  }

  return (
    <div className="space-y-6 max-w-md">
      <p className="text-sm text-surface-400">
        Customize the look and feel of your workspace. These settings apply to all members.
      </p>

      {/* Logo */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-surface-300">Logo</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-surface-600 bg-surface-900 overflow-hidden">
            {branding?.logoUrl ? (
              <img
                src={`${apiBase}${branding.logoUrl}`}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-surface-500">Logo</span>
            )}
          </div>
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              size="sm"
              variant="secondary"
              loading={uploadLogo.isPending}
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload logo
            </Button>
            <p className="mt-1 text-xs text-surface-500">PNG, JPG, SVG, or WebP. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-surface-300">Browser Tab Icon (Favicon)</label>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-surface-600 bg-surface-900 overflow-hidden">
            {branding?.faviconUrl ? (
              <img
                src={`${apiBase}${branding.faviconUrl}`}
                alt="Favicon"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[10px] text-surface-500">ICO</span>
            )}
          </div>
          <div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
              onChange={handleFaviconUpload}
              className="hidden"
            />
            <Button
              size="sm"
              variant="secondary"
              loading={uploadFavicon.isPending}
              onClick={() => faviconInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload favicon
            </Button>
            <p className="mt-1 text-xs text-surface-500">ICO, PNG, or SVG. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Organization Name */}
      <Input
        label="Organization name"
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        placeholder="e.g. My Company"
      />
      <p className="-mt-4 text-xs text-surface-500">
        Displayed in the sidebar and browser tab title.
      </p>

      {/* Primary Color */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-surface-300">Primary Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border border-surface-600 bg-surface-900 p-0.5"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-28 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            maxLength={20}
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        loading={updateBranding.isPending}
      >
        Save branding
      </Button>
    </div>
  );
}
