import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Users,
  FolderKanban,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Archive,
  RotateCcw,
  Trash2,
  Layers,
  Circle,
  Filter,
} from 'lucide-react';
import { useWorkspace, useUpdateWorkspace, useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useProjects';
import { adminApi } from '@/api/admin';
import { WorkspaceMembers } from '@/components/settings/WorkspaceMembers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageError } from '@/components/ui/PageError';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardBody } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

type Tab = 'general' | 'members' | 'projects' | 'audit' | 'deleted';

const TABS: { key: Tab; label: string; icon: typeof Settings }[] = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'audit', label: 'Audit Log', icon: ClipboardList },
  { key: 'deleted', label: 'Deleted Items', icon: Archive },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const ENTITY_TYPES = ['project', 'task', 'space', 'comment', 'workspace', 'time_entry', 'user', 'label', 'attachment', 'settings'] as const;
const AUDIT_ACTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'restored', label: 'Restored' },
  { value: 'hard_deleted', label: 'Hard deleted' },
  { value: 'commented', label: 'Commented' },
  { value: 'member_added', label: 'Member added' },
  { value: 'member_removed', label: 'Member removed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'status_changed', label: 'Status changed' },
  { value: 'logged_time', label: 'Logged time' },
  { value: 'user_created', label: 'User created' },
  { value: 'user_deleted', label: 'User deleted' },
  { value: 'settings_updated', label: 'Settings updated' },
] as const;

export function WorkspaceAdminPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace, isLoading, isError, error, refetch } = useWorkspace(workspaceId || '');
  const { data: members } = useWorkspaceMembers(workspaceId || '');
  const { data: projects, isLoading: projectsLoading } = useProjects(workspaceId || '');
  const updateWorkspace = useUpdateWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Audit log state
  const [auditPage, setAuditPage] = useState(1);
  const [auditEntityType, setAuditEntityType] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditGoTo, setAuditGoTo] = useState('');

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin', 'audit', workspaceId, auditPage, auditEntityType, auditAction],
    queryFn: () => adminApi.listAuditLogs({
      workspaceId,
      page: auditPage,
      limit: 25,
      entityType: auditEntityType || undefined,
      action: auditAction || undefined,
    }),
    enabled: activeTab === 'audit' && !!workspaceId,
  });

  // Deleted items queries
  const { data: deletedTasks } = useQuery({
    queryKey: ['admin', 'tasks', 'deleted', workspaceId],
    queryFn: () => adminApi.listDeletedTasks({ workspaceId }),
    enabled: activeTab === 'deleted' && !!workspaceId,
  });

  const { data: deletedProjects } = useQuery({
    queryKey: ['admin', 'projects', 'deleted', workspaceId],
    queryFn: () => adminApi.listDeletedProjects({ workspaceId }),
    enabled: activeTab === 'deleted' && !!workspaceId,
  });

  const { data: deletedSpaces } = useQuery({
    queryKey: ['admin', 'spaces', 'deleted', workspaceId],
    queryFn: () => adminApi.listDeletedSpaces({ workspaceId }),
    enabled: activeTab === 'deleted' && !!workspaceId,
  });

  const restoreTaskMutation = useMutation({
    mutationFn: (taskId: string) => adminApi.restoreTask(taskId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Task restored' });
      qc.invalidateQueries({ queryKey: ['admin', 'tasks', 'deleted'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to restore task', description: (err as Error).message }),
  });

  const hardDeleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => adminApi.hardDeleteTask(taskId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Task permanently deleted' });
      qc.invalidateQueries({ queryKey: ['admin', 'tasks', 'deleted'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to delete task', description: (err as Error).message }),
  });

  const restoreProjectMutation = useMutation({
    mutationFn: (projectId: string) => adminApi.restoreProject(projectId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Project restored' });
      qc.invalidateQueries({ queryKey: ['admin', 'projects', 'deleted'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to restore project', description: (err as Error).message }),
  });

  const hardDeleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => adminApi.hardDeleteProject(projectId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Project permanently deleted' });
      qc.invalidateQueries({ queryKey: ['admin', 'projects', 'deleted'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to delete project', description: (err as Error).message }),
  });

  const restoreSpaceMutation = useMutation({
    mutationFn: (spaceId: string) => adminApi.restoreSpace(spaceId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Space restored' });
      qc.invalidateQueries({ queryKey: ['admin', 'spaces', 'deleted'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to restore space', description: (err as Error).message }),
  });

  const hardDeleteSpaceMutation = useMutation({
    mutationFn: (spaceId: string) => adminApi.hardDeleteSpace(spaceId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Space permanently deleted' });
      qc.invalidateQueries({ queryKey: ['admin', 'spaces', 'deleted'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to delete space', description: (err as Error).message }),
  });

  const [hardDeleteConfirm, setHardDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
    }
  }, [workspace?.id]);

  function handleSave() {
    if (!workspaceId || !name.trim()) return;
    updateWorkspace.mutate(
      { id: workspaceId, data: { name: name.trim(), description } },
      {
        onSuccess: () => toast({ type: 'success', title: 'Workspace settings saved' }),
        onError: (err) => toast({ type: 'error', title: 'Failed to save', description: (err as Error).message }),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return <PageError message={(error as Error)?.message || 'Failed to load workspace'} onRetry={refetch} />;
  }

  if (!workspace) {
    return <div className="flex items-center justify-center py-20"><p className="text-surface-500">Workspace not found</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-100 flex items-center gap-3">
          <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" />
          Workspace Admin
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          Manage <span className="font-medium text-surface-300">{workspace.name}</span> — members, projects, and settings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-surface-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 border-b-2 whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
              activeTab === tab.key
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200',
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ').pop()}</span>
          </button>
        ))}
      </div>

      {/* ── General ──────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="rounded-xl border border-surface-700 bg-surface-800 p-6">
          <div className="space-y-4 max-w-md">
            <Input label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-900 hover:border-surface-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">Slug</label>
              <div className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-500">
                {workspace.slug}
              </div>
            </div>
            <Button onClick={handleSave} loading={updateWorkspace.isPending} disabled={!name.trim()}>
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* ── Members ──────────────────────────────────────────── */}
      {activeTab === 'members' && workspaceId && members && (
        <div className="rounded-xl border border-surface-700 bg-surface-800 p-6">
          <WorkspaceMembers workspaceId={workspaceId} members={members} />
        </div>
      )}

      {/* ── Projects ─────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="rounded-xl border border-surface-700 bg-surface-800 p-6">
          {projectsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !projects || projects.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-8">No projects in this workspace yet.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_120px_120px_100px] gap-3 px-3 py-2 text-xs font-medium text-surface-500 uppercase tracking-wider">
                <span>Project</span>
                <span>Key</span>
                <span>Created</span>
                <span className="text-right">Actions</span>
              </div>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-[1fr_120px_120px_100px] gap-3 items-center rounded-lg px-3 py-2.5 hover:bg-surface-700/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600/15 text-xs font-bold text-primary-400">
                      {project.key}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-200 truncate">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-surface-500 truncate">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-surface-400 font-mono">{project.key}</span>
                  <span className="text-xs text-surface-500">
                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}
                  </span>
                  <div className="text-right">
                    <Link
                      to={`/projects/${project.id}/settings`}
                      className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Log ────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" />
              <select
                value={auditEntityType}
                onChange={(e) => { setAuditEntityType(e.target.value); setAuditPage(1); }}
                className="appearance-none rounded-lg border border-surface-700 bg-surface-900 pl-8 pr-8 py-1.5 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All entity types</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" />
              <select
                value={auditAction}
                onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
                className="appearance-none rounded-lg border border-surface-700 bg-surface-900 pl-8 pr-8 py-1.5 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All actions</option>
                {AUDIT_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            {(auditEntityType || auditAction) && (
              <button
                onClick={() => { setAuditEntityType(''); setAuditAction(''); setAuditPage(1); }}
                className="text-xs text-surface-400 hover:text-surface-200 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="rounded-xl border border-surface-700 bg-surface-800 overflow-hidden">
            {auditLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded bg-surface-700/50" />
                ))}
              </div>
            ) : !auditData?.logs || auditData.logs.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-8">No audit entries for this workspace.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-700/30 text-left">
                      <th className="px-4 py-2.5 text-xs font-medium text-surface-400">Time</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-surface-400">User</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-surface-400">Action</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-surface-400">Entity</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-surface-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/60">
                    {auditData.logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-surface-700/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-surface-500 whitespace-nowrap">
                          {timeAgo(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={log.user?.avatarUrl}
                              name={`${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim()}
                              size="sm"
                            />
                            <span className="text-xs text-surface-300 whitespace-nowrap">
                              {`${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[11px] font-medium',
                            log.action === 'created' ? 'bg-emerald-500/15 text-emerald-400' :
                            log.action === 'deleted' || log.action === 'hard_deleted' ? 'bg-red-500/15 text-red-400' :
                            'bg-blue-500/15 text-blue-400',
                          )}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[11px] text-surface-300">
                            {log.entityType?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-surface-500 max-w-[200px] truncate">
                          {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) + (JSON.stringify(log.metadata).length > 60 ? '...' : '') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {auditData?.pagination && auditData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-surface-500">
                Page {auditData.pagination.page} of {auditData.pagination.totalPages} ({auditData.pagination.total} entries)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAuditPage(1)}
                  disabled={auditPage <= 1}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs transition-colors',
                    auditPage <= 1 ? 'text-surface-600 cursor-not-allowed' : 'text-surface-300 hover:bg-surface-700',
                  )}
                >
                  First
                </button>
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs transition-colors',
                    auditPage <= 1 ? 'text-surface-600 cursor-not-allowed' : 'text-surface-300 hover:bg-surface-700',
                  )}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {(() => {
                  const total = auditData.pagination.totalPages;
                  const current = auditPage;
                  const pages: (number | '...')[] = [];
                  if (total <= 7) {
                    for (let i = 1; i <= total; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (current > 3) pages.push('...');
                    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
                    if (current < total - 2) pages.push('...');
                    pages.push(total);
                  }
                  return pages.map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-surface-500">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setAuditPage(p)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs transition-colors',
                          p === current ? 'bg-primary-500/20 text-primary-400 font-medium' : 'text-surface-300 hover:bg-surface-700',
                        )}
                      >
                        {p}
                      </button>
                    ),
                  );
                })()}
                <button
                  onClick={() => setAuditPage((p) => Math.min(auditData.pagination.totalPages, p + 1))}
                  disabled={auditPage >= auditData.pagination.totalPages}
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs transition-colors',
                    auditPage >= auditData.pagination.totalPages ? 'text-surface-600 cursor-not-allowed' : 'text-surface-300 hover:bg-surface-700',
                  )}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setAuditPage(auditData.pagination.totalPages)}
                  disabled={auditPage >= auditData.pagination.totalPages}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs transition-colors',
                    auditPage >= auditData.pagination.totalPages ? 'text-surface-600 cursor-not-allowed' : 'text-surface-300 hover:bg-surface-700',
                  )}
                >
                  Last
                </button>
                <div className="ml-2 flex items-center gap-1">
                  <span className="text-xs text-surface-500">Go to</span>
                  <input
                    type="text"
                    value={auditGoTo}
                    onChange={(e) => setAuditGoTo(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const p = Math.max(1, Math.min(auditData.pagination.totalPages, Number(auditGoTo) || 1));
                        setAuditPage(p);
                        setAuditGoTo('');
                      }
                    }}
                    className="w-12 rounded border border-surface-700 bg-surface-900 px-1.5 py-0.5 text-xs text-surface-200 text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="#"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Deleted Items ────────────────────────────────────── */}
      {activeTab === 'deleted' && (
        <div className="space-y-6">
          {/* Deleted Projects */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-200">
              <FolderKanban className="h-4 w-4 text-surface-400" />
              Deleted Projects
              {deletedProjects && deletedProjects.length > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                  {deletedProjects.length}
                </span>
              )}
            </h3>
            <Card>
              <CardBody>
                {!deletedProjects || deletedProjects.length === 0 ? (
                  <p className="text-sm text-surface-500 text-center py-2">No deleted projects</p>
                ) : (
                  <div className="space-y-2">
                    {deletedProjects.map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between rounded-lg border border-surface-700 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-3.5 w-3.5 text-surface-500" />
                          <span className="text-sm text-surface-200 line-through opacity-70">{project.name}</span>
                          <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] text-surface-500">{project.key}</span>
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
                            Deleted {project.deletedAt ? new Date(project.deletedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => restoreProjectMutation.mutate(project.id)}
                            title="Restore project"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                          <button
                            onClick={() => setHardDeleteConfirm({ type: 'project', id: project.id, name: project.name })}
                            title="Permanently delete"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Deleted Tasks */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-200">
              <Archive className="h-4 w-4 text-surface-400" />
              Deleted Tasks
              {deletedTasks && deletedTasks.length > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                  {deletedTasks.length}
                </span>
              )}
            </h3>
            <Card>
              <CardBody>
                {!deletedTasks || deletedTasks.length === 0 ? (
                  <p className="text-sm text-surface-500 text-center py-2">No deleted tasks</p>
                ) : (
                  <div className="space-y-2">
                    {deletedTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between rounded-lg border border-surface-700 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-500">#{task.taskNumber}</span>
                          <span className="text-sm text-surface-200 line-through opacity-70">{task.title}</span>
                          <span className="text-[10px] text-surface-500">({task.project?.name})</span>
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
                            Deleted {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => restoreTaskMutation.mutate(task.id)}
                            title="Restore task"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                          <button
                            onClick={() => setHardDeleteConfirm({ type: 'task', id: task.id, name: task.title })}
                            title="Permanently delete"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Deleted Spaces */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-200">
              <Layers className="h-4 w-4 text-surface-400" />
              Deleted Spaces
              {deletedSpaces && deletedSpaces.length > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                  {deletedSpaces.length}
                </span>
              )}
            </h3>
            <Card>
              <CardBody>
                {!deletedSpaces || deletedSpaces.length === 0 ? (
                  <p className="text-sm text-surface-500 text-center py-2">No deleted spaces</p>
                ) : (
                  <div className="space-y-2">
                    {deletedSpaces.map((space: any) => (
                      <div key={space.id} className="flex items-center justify-between rounded-lg border border-surface-700 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Circle className="h-3 w-3" fill={space.color || '#4ade80'} stroke={space.color || '#4ade80'} />
                          <span className="text-sm text-surface-200 line-through opacity-70">{space.name}</span>
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
                            Deleted {space.deletedAt ? new Date(space.deletedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => restoreSpaceMutation.mutate(space.id)}
                            title="Restore space"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                          <button
                            onClick={() => setHardDeleteConfirm({ type: 'space', id: space.id, name: space.name })}
                            title="Permanently delete"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Hard delete confirmation modal */}
          {hardDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
              <Card className="w-full max-w-md">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-400">Permanently Delete</h3>
                  <p className="text-sm text-surface-400">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-medium text-surface-200">{hardDeleteConfirm.name}</span>?
                    This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setHardDeleteConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const { type, id } = hardDeleteConfirm;
                        if (type === 'task') hardDeleteTaskMutation.mutate(id);
                        else if (type === 'project') hardDeleteProjectMutation.mutate(id);
                        else if (type === 'space') hardDeleteSpaceMutation.mutate(id);
                        setHardDeleteConfirm(null);
                      }}
                    >
                      Permanently Delete
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
