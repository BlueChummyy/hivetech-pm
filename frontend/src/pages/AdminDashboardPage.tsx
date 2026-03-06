import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Search,
  Eye,
  EyeOff,
  Trash2,
  UserX,
  UserCheck,
  Building2,
  FolderKanban,
  X,
  Circle,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Mail,
  Paintbrush,
  Upload,
  Lock,
  Pencil,
} from 'lucide-react';
import { adminApi, type AdminUser, type SmtpSettingsData, type OAuthProviderConfig, type UpsertAuthProviderData } from '@/api/admin';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import { useCreateWorkspace } from '@/hooks/useWorkspaces';
import { useCreateSpace } from '@/hooks/useSpaces';
import { useCreateProject } from '@/hooks/useProjects';
import { useBranding, useUpdateBranding, useUploadLogo, useUploadFavicon } from '@/hooks/useBranding';
import { cn } from '@/utils/cn';
import { getBackgroundStyle } from '@/utils/backgroundTemplates';

type Tab = 'users' | 'workspaces' | 'smtp' | 'branding' | 'auth';

const WORKSPACE_ROLES = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'MEMBER', label: 'Team Member' },
  { value: 'VIEWER', label: 'Viewer' },
];

const ASSIGNABLE_ROLES = WORKSPACE_ROLES.filter((r) => r.value !== 'OWNER');

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // ── Users list ───────────────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.listUsers({ search: search || undefined, limit: 100 }),
  });

  // ── Workspaces list ────────────────────────────────────────────────
  const { data: workspacesData, isLoading: workspacesLoading } = useQuery({
    queryKey: ['admin', 'workspaces'],
    queryFn: () => adminApi.listWorkspaces(),
  });

  // ── Spaces list ────────────────────────────────────────────────
  const { data: spacesData, isLoading: spacesLoading } = useQuery({
    queryKey: ['admin', 'spaces'],
    queryFn: () => adminApi.listSpaces(),
  });

  // ── Projects list (for space assignment) ────────────────────────
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['admin', 'projects'],
    queryFn: () => adminApi.listProjects(),
  });

  // ── Create user form ─────────────────────────────────────────────
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    workspaceRole: 'MEMBER' as 'ADMIN' | 'PROJECT_MANAGER' | 'MEMBER' | 'VIEWER',
  });
  const [showPassword, setShowPassword] = useState(false);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  const createUserMutation = useMutation({
    mutationFn: () => adminApi.createUser(newUser),
    onSuccess: () => {
      toast({ type: 'success', title: 'User created successfully' });
      setNewUser({ email: '', password: '', firstName: '', lastName: '', workspaceRole: 'MEMBER' });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowCreateUserModal(false);
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to create user', description: (err as Error).message });
    },
  });

  // ── App Settings (hide create user, etc.) ──────────────────────────
  const { data: appSettings } = useQuery({
    queryKey: ['admin', 'app-settings'],
    queryFn: () => adminApi.getAppSettings(),
  });

  const toggleHideRegistration = useMutation({
    mutationFn: (hide: boolean) => adminApi.updateAppSettings({ hidePublicRegistration: hide }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'app-settings'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update setting', description: (err as Error).message });
    },
  });

  // ── SMTP Settings ────────────────────────────────────────────────────
  const [smtpForm, setSmtpForm] = useState<SmtpSettingsData>({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromName: '',
    fromEmail: '',
  });

  const { data: smtpData, isLoading: smtpLoading } = useQuery({
    queryKey: ['admin', 'smtp-settings'],
    queryFn: () => adminApi.getSmtpSettings(),
    enabled: activeTab === 'smtp',
  });

  // Sync form with fetched data
  useEffect(() => {
    if (smtpData?.settings) {
      setSmtpForm(smtpData.settings);
    }
  }, [smtpData?.settings]);

  const saveSmtpMutation = useMutation({
    mutationFn: () => adminApi.updateSmtpSettings(smtpForm),
    onSuccess: () => {
      toast({ type: 'success', title: 'SMTP settings saved' });
      qc.invalidateQueries({ queryKey: ['admin', 'smtp-settings'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to save SMTP settings', description: (err as Error).message });
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: () => adminApi.testSmtpConnection(),
    onSuccess: (data) => {
      toast({ type: 'success', title: data.message });
    },
    onError: (err: unknown) => {
      // Extract server error message from axios response
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const serverMsg = axiosErr.response?.data?.error?.message || axiosErr.message || 'Unknown error';
      toast({ type: 'error', title: 'SMTP test failed', description: serverMsg });
    },
  });

  // ── Reset password ───────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminApi.resetPassword(resetTarget!.id, resetPassword),
    onSuccess: () => {
      toast({ type: 'success', title: 'Password reset successfully' });
      setResetTarget(null);
      setResetPassword('');
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to reset password', description: (err as Error).message });
    },
  });

  // ── Delete user ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      toast({ type: 'success', title: 'User deleted successfully' });
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to delete user', description: (err as Error).message });
    },
  });

  // ── Deactivate user ────────────────────────────────────────────────
  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deactivateUser(userId),
    onSuccess: (data) => {
      toast({ type: 'success', title: data.message });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update user status', description: (err as Error).message });
    },
  });

  // ── Edit user ────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', isActive: true });

  const updateUserMutation = useMutation({
    mutationFn: () => adminApi.updateUser(editTarget!.id, editForm),
    onSuccess: () => {
      toast({ type: 'success', title: 'User updated successfully' });
      setEditTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update user', description: (err as Error).message });
    },
  });

  // ── Update role ──────────────────────────────────────────────────
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, workspaceId, role }: { userId: string; workspaceId: string; role: string }) =>
      adminApi.updateRole(userId, workspaceId, role),
    onSuccess: () => {
      toast({ type: 'success', title: 'Role updated' });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update role', description: (err as Error).message });
    },
  });

  // ── Delete workspace ───────────────────────────────────────────────
  const [deleteWsTarget, setDeleteWsTarget] = useState<{ id: string; name: string } | null>(null);

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (workspaceId: string) => adminApi.deleteWorkspace(workspaceId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Workspace deleted successfully' });
      setDeleteWsTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to delete workspace', description: (err as Error).message });
    },
  });

  // ── Consolidated workspaces tab state ─────────────────────────────────
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [showCreateWsForm, setShowCreateWsForm] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [createSpaceForWs, setCreateSpaceForWs] = useState<string | null>(null);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState('#4ade80');
  const [createProjectForWs, setCreateProjectForWs] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectKey, setNewProjectKey] = useState('');

  const createWorkspaceMutation = useCreateWorkspace();
  const createSpaceMutation = useCreateSpace();
  const createProjectMutation = useCreateProject();

  const toggleWsExpanded = (wsId: string) => {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  };

  // ── Assign workspace ────────────────────────────────────────────────
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [assignWsId, setAssignWsId] = useState('');
  const [assignRole, setAssignRole] = useState('MEMBER');

  const assignWorkspaceMutation = useMutation({
    mutationFn: () => adminApi.assignWorkspace(assignTarget!.id, assignWsId, assignRole),
    onSuccess: () => {
      toast({ type: 'success', title: 'User assigned to workspace' });
      setAssignTarget(null);
      setAssignWsId('');
      setAssignRole('MEMBER');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to assign workspace', description: (err as Error).message });
    },
  });

  const removeWorkspaceMutation = useMutation({
    mutationFn: ({ userId, workspaceId }: { userId: string; workspaceId: string }) =>
      adminApi.removeWorkspace(userId, workspaceId),
    onSuccess: () => {
      toast({ type: 'success', title: 'User removed from workspace' });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to remove from workspace', description: (err as Error).message });
    },
  });

  // ── Assign project space mutation ──────────────────────────────────
  const assignProjectSpaceMutation = useMutation({
    mutationFn: ({ projectId, spaceId }: { projectId: string; spaceId: string | null }) =>
      adminApi.assignProjectSpace(projectId, spaceId),
    onSuccess: () => {
      toast({ type: 'success', title: 'Project space updated' });
      qc.invalidateQueries({ queryKey: ['admin', 'spaces'] });
      qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update project space', description: (err as Error).message });
    },
  });

  // ── Branding ──────────────────────────────────────────────────────
  const { data: branding } = useBranding();
  const updateBranding = useUpdateBranding();
  const uploadLogo = useUploadLogo();
  const uploadFavicon = useUploadFavicon();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [brandingForm, setBrandingForm] = useState({ orgName: '', primaryColor: '#22c55e', loginBackground: '', appBackground: '' });

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        orgName: branding.orgName || '',
        primaryColor: branding.primaryColor || '#22c55e',
        loginBackground: branding.loginBackground || '',
        appBackground: branding.appBackground || '',
      });
    }
  }, [branding?.id]);

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'workspaces', label: 'Workspaces', icon: Building2 },
    { id: 'smtp', label: 'SMTP Settings', icon: Mail },
    { id: 'branding', label: 'Branding', icon: Paintbrush },
    { id: 'auth', label: 'Authentication', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-100 flex items-center gap-3">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" />
          Global Admin
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          System-wide administration — manage all users, workspaces, and platform settings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-surface-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
              activeTab === tab.id
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

      {/* ── Users Tab ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search + Create User button */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-surface-700 bg-surface-900 pl-10 pr-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setNewUser({ email: '', password: '', firstName: '', lastName: '', workspaceRole: 'MEMBER' });
                setShowPassword(false);
                setShowCreateUserModal(true);
              }}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              Create User
            </Button>
          </div>

          {/* Users table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">Workspace Roles</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-surface-700/50">
                        <td className="px-4 py-3" colSpan={5}>
                          <div className="h-5 w-full animate-pulse rounded bg-surface-700" />
                        </td>
                      </tr>
                    ))
                  ) : usersData?.users && usersData.users.length > 0 ? (
                    usersData.users.map((user) => {
                      const isSelf = user.id === currentUser?.id;
                      return (
                      <tr key={user.id} className="border-b border-surface-700/50 hover:bg-surface-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={user.avatarUrl}
                              name={user.name || `${user.firstName} ${user.lastName}`}
                              size="sm"
                            />
                            <span className="font-medium text-surface-200">
                              {user.name || `${user.firstName} ${user.lastName}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-surface-400">{user.email}</td>
                        <td className="px-4 py-3">
                          {user.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {user.workspaceMembers.map((m) => {
                              const isOwner = m.role === 'OWNER';
                              return (
                                <div key={m.workspace.id} className="flex items-center gap-2">
                                  <span className="text-xs text-surface-500 truncate max-w-[100px]" title={m.workspace.name}>
                                    {m.workspace.name}:
                                  </span>
                                  {isOwner ? (
                                    <span className="rounded-md bg-primary-600/20 px-2 py-0.5 text-xs font-medium text-primary-400">
                                      Owner
                                    </span>
                                  ) : (
                                    <>
                                      <select
                                        value={m.role}
                                        onChange={(e) =>
                                          updateRoleMutation.mutate({
                                            userId: user.id,
                                            workspaceId: m.workspace.id,
                                            role: e.target.value,
                                          })
                                        }
                                        className="rounded-md border border-surface-700 bg-surface-800 px-2 py-0.5 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      >
                                        {ASSIGNABLE_ROLES.map((r) => (
                                          <option key={r.value} value={r.value}>
                                            {r.label}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => removeWorkspaceMutation.mutate({ userId: user.id, workspaceId: m.workspace.id })}
                                        title="Remove from workspace"
                                        className="text-red-400/60 hover:text-red-400 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              onClick={() => {
                                setAssignTarget(user);
                                setAssignWsId('');
                                setAssignRole('MEMBER');
                              }}
                              className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors mt-0.5"
                            >
                              + Assign workspace
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditTarget(user);
                                setEditForm({
                                  firstName: user.firstName,
                                  lastName: user.lastName,
                                  email: user.email,
                                  isActive: user.isActive,
                                });
                              }}
                              title="Edit User"
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setResetTarget(user);
                                setResetPassword('');
                                setShowResetPassword(false);
                              }}
                              title="Reset Password"
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => !isSelf && deactivateUserMutation.mutate(user.id)}
                              title={isSelf ? 'Cannot deactivate yourself' : user.isActive ? 'Deactivate User' : 'Activate User'}
                              disabled={isSelf}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                                isSelf
                                  ? 'text-surface-600 cursor-not-allowed'
                                  : user.isActive
                                    ? 'text-yellow-400 hover:bg-yellow-500/10'
                                    : 'text-green-400 hover:bg-green-500/10',
                              )}
                            >
                              {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => !isSelf && setDeleteTarget(user)}
                              title={isSelf ? 'Cannot delete yourself' : 'Delete User'}
                              disabled={isSelf}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                                isSelf
                                  ? 'text-surface-600 cursor-not-allowed'
                                  : 'text-red-400 hover:bg-red-500/10',
                              )}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Reset password modal */}
          {resetTarget && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
              <Card className="w-full max-w-md">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-surface-100">Reset Password</h3>
                  <p className="text-sm text-surface-400">
                    Set a new password for{' '}
                    <span className="font-medium text-surface-200">
                      {resetTarget.name || `${resetTarget.firstName} ${resetTarget.lastName}`}
                    </span>{' '}
                    ({resetTarget.email})
                  </p>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="New password (min 8 characters)"
                      className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 pr-10 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                    >
                      {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setResetTarget(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={resetPassword.length < 8 || resetPasswordMutation.isPending}
                      onClick={() => resetPasswordMutation.mutate()}
                    >
                      {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Delete user confirmation modal */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
              <Card className="w-full max-w-md">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-400">Delete User</h3>
                  <p className="text-sm text-surface-400">
                    Are you sure you want to delete{' '}
                    <span className="font-medium text-surface-200">
                      {deleteTarget.name || `${deleteTarget.firstName} ${deleteTarget.lastName}`}
                    </span>{' '}
                    ({deleteTarget.email})? This will remove them from all workspaces and projects.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deleteUserMutation.isPending}
                      onClick={() => deleteUserMutation.mutate(deleteTarget.id)}
                    >
                      {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
          {/* Edit user modal */}
          {editTarget && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
              <Card className="w-full max-w-md">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-surface-100">Edit User</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">First Name</label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">Last Name</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">Status</label>
                      <select
                        value={editForm.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim() || updateUserMutation.isPending}
                      onClick={() => updateUserMutation.mutate()}
                    >
                      {updateUserMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Assign workspace modal */}
          {assignTarget && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
              <Card className="w-full max-w-md">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-surface-100">Assign Workspace</h3>
                  <p className="text-sm text-surface-400">
                    Add{' '}
                    <span className="font-medium text-surface-200">
                      {assignTarget.name || `${assignTarget.firstName} ${assignTarget.lastName}`}
                    </span>{' '}
                    to a workspace.
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">Workspace</label>
                      <select
                        value={assignWsId}
                        onChange={(e) => setAssignWsId(e.target.value)}
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Select a workspace...</option>
                        {workspacesData
                          ?.filter((ws) => !assignTarget.workspaceMembers.some((m) => m.workspace.id === ws.id))
                          .map((ws) => (
                            <option key={ws.id} value={ws.id}>
                              {ws.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">Role</label>
                      <select
                        value={assignRole}
                        onChange={(e) => setAssignRole(e.target.value)}
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setAssignTarget(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!assignWsId || assignWorkspaceMutation.isPending}
                      onClick={() => assignWorkspaceMutation.mutate()}
                    >
                      {assignWorkspaceMutation.isPending ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Create user modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
              <Card className="w-full max-w-lg">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-surface-100">Create New User</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">First Name</label>
                      <input
                        type="text"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                        placeholder="John"
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-surface-400">Last Name</label>
                      <input
                        type="text"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                        placeholder="Doe"
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-400">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="john.doe@company.com"
                      className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-400">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Minimum 8 characters"
                        className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 pr-10 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-400">Workspace Role</label>
                    <select
                      value={newUser.workspaceRole}
                      onChange={(e) => setNewUser({ ...newUser, workspaceRole: e.target.value as any })}
                      className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowCreateUserModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={
                        !newUser.email ||
                        !newUser.firstName ||
                        !newUser.lastName ||
                        newUser.password.length < 8 ||
                        createUserMutation.isPending
                      }
                      onClick={() => createUserMutation.mutate()}
                    >
                      {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Workspaces Tab (consolidated with Spaces & Projects) ── */}
      {activeTab === 'workspaces' && (
        <div className="space-y-4">
          {/* Create Workspace button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-400">
              Manage workspaces, spaces, and projects in one view.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setShowCreateWsForm(true); setNewWsName(''); }}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Create Workspace
            </Button>
          </div>

          {/* Create Workspace inline form */}
          {showCreateWsForm && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary-400 shrink-0" />
                  <input
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="Workspace name..."
                    autoFocus
                    className="flex-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newWsName.trim()) {
                        createWorkspaceMutation.mutate({ name: newWsName.trim() }, {
                          onSuccess: () => {
                            toast({ type: 'success', title: 'Workspace created' });
                            setShowCreateWsForm(false);
                            setNewWsName('');
                            qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
                          },
                          onError: (err) => {
                            toast({ type: 'error', title: 'Failed to create workspace', description: (err as Error).message });
                          },
                        });
                      } else if (e.key === 'Escape') {
                        setShowCreateWsForm(false);
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!newWsName.trim() || createWorkspaceMutation.isPending}
                    onClick={() => {
                      createWorkspaceMutation.mutate({ name: newWsName.trim() }, {
                        onSuccess: () => {
                          toast({ type: 'success', title: 'Workspace created' });
                          setShowCreateWsForm(false);
                          setNewWsName('');
                          qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
                        },
                        onError: (err) => {
                          toast({ type: 'error', title: 'Failed to create workspace', description: (err as Error).message });
                        },
                      });
                    }}
                  >
                    {createWorkspaceMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                  <button
                    onClick={() => setShowCreateWsForm(false)}
                    className="text-surface-400 hover:text-surface-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Loading state */}
          {(workspacesLoading || spacesLoading || projectsLoading) ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardBody>
                    <div className="h-6 w-full animate-pulse rounded bg-surface-700" />
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : workspacesData && workspacesData.length > 0 ? (
            <div className="space-y-3">
              {workspacesData.map((ws) => {
                const owner = ws.members[0]?.user;
                const isExpanded = expandedWs.has(ws.id);
                // Spaces belonging to this workspace
                const wsSpaces = (spacesData ?? []).filter((s) => s.workspaceId === ws.id);
                // Projects belonging to this workspace but not assigned to any space
                const unassignedProjects = (projectsData ?? []).filter(
                  (p) => p.workspaceId === ws.id && !p.spaceId,
                );

                return (
                  <Card key={ws.id}>
                    {/* Workspace header (accordion toggle) */}
                    <button
                      onClick={() => toggleWsExpanded(ws.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-800/30 transition-colors rounded-t-lg"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/20 text-primary-400 shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-surface-200">{ws.name}</p>
                        <p className="text-xs text-surface-500">{ws.slug}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-surface-400">
                          {owner ? `${owner.firstName} ${owner.lastName}` : '—'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                          <Users className="h-3.5 w-3.5" />
                          {ws._count.members}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                          <FolderKanban className="h-3.5 w-3.5" />
                          {ws._count.projects}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                          <Layers className="h-3.5 w-3.5" />
                          {wsSpaces.length}
                        </span>
                        <span className="hidden sm:inline text-xs text-surface-500">
                          {new Date(ws.createdAt).toLocaleDateString()}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-surface-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-surface-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <CardBody className="border-t border-surface-700 space-y-4">
                        {/* Workspace actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateSpaceForWs(ws.id);
                              setNewSpaceName('');
                              setNewSpaceColor('#4ade80');
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create Space
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateProjectForWs(ws.id);
                              setNewProjectName('');
                              setNewProjectKey('');
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create Project
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteWsTarget({ id: ws.id, name: ws.name });
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors ml-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Workspace
                          </button>
                        </div>

                        {/* Inline create space form */}
                        {createSpaceForWs === ws.id && (
                          <div className="flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-900/50 p-3">
                            <input
                              type="color"
                              value={newSpaceColor}
                              onChange={(e) => setNewSpaceColor(e.target.value)}
                              className="h-7 w-7 rounded border-0 bg-transparent cursor-pointer shrink-0"
                              title="Space color"
                            />
                            <input
                              type="text"
                              value={newSpaceName}
                              onChange={(e) => setNewSpaceName(e.target.value)}
                              placeholder="Space name..."
                              autoFocus
                              className="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSpaceName.trim()) {
                                  createSpaceMutation.mutate(
                                    { workspaceId: ws.id, data: { name: newSpaceName.trim(), color: newSpaceColor } },
                                    {
                                      onSuccess: () => {
                                        toast({ type: 'success', title: 'Space created' });
                                        setCreateSpaceForWs(null);
                                        qc.invalidateQueries({ queryKey: ['admin', 'spaces'] });
                                      },
                                      onError: (err) => {
                                        toast({ type: 'error', title: 'Failed to create space', description: (err as Error).message });
                                      },
                                    },
                                  );
                                } else if (e.key === 'Escape') {
                                  setCreateSpaceForWs(null);
                                }
                              }}
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!newSpaceName.trim() || createSpaceMutation.isPending}
                              onClick={() => {
                                createSpaceMutation.mutate(
                                  { workspaceId: ws.id, data: { name: newSpaceName.trim(), color: newSpaceColor } },
                                  {
                                    onSuccess: () => {
                                      toast({ type: 'success', title: 'Space created' });
                                      setCreateSpaceForWs(null);
                                      qc.invalidateQueries({ queryKey: ['admin', 'spaces'] });
                                    },
                                    onError: (err) => {
                                      toast({ type: 'error', title: 'Failed to create space', description: (err as Error).message });
                                    },
                                  },
                                );
                              }}
                            >
                              {createSpaceMutation.isPending ? 'Creating...' : 'Create'}
                            </Button>
                            <button onClick={() => setCreateSpaceForWs(null)} className="text-surface-400 hover:text-surface-200">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Inline create project form */}
                        {createProjectForWs === ws.id && (
                          <div className="flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-900/50 p-3">
                            <FolderKanban className="h-4 w-4 text-green-400 shrink-0" />
                            <input
                              type="text"
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                              placeholder="Project name..."
                              autoFocus
                              className="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setCreateProjectForWs(null);
                              }}
                            />
                            <input
                              type="text"
                              value={newProjectKey}
                              onChange={(e) => setNewProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                              placeholder="KEY"
                              maxLength={6}
                              className="w-20 rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500 uppercase"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newProjectName.trim() && newProjectKey.trim()) {
                                  createProjectMutation.mutate(
                                    { workspaceId: ws.id, name: newProjectName.trim(), key: newProjectKey.trim() },
                                    {
                                      onSuccess: () => {
                                        toast({ type: 'success', title: 'Project created' });
                                        setCreateProjectForWs(null);
                                        qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
                                        qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
                                      },
                                      onError: (err) => {
                                        toast({ type: 'error', title: 'Failed to create project', description: (err as Error).message });
                                      },
                                    },
                                  );
                                } else if (e.key === 'Escape') {
                                  setCreateProjectForWs(null);
                                }
                              }}
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!newProjectName.trim() || !newProjectKey.trim() || createProjectMutation.isPending}
                              onClick={() => {
                                createProjectMutation.mutate(
                                  { workspaceId: ws.id, name: newProjectName.trim(), key: newProjectKey.trim() },
                                  {
                                    onSuccess: () => {
                                      toast({ type: 'success', title: 'Project created' });
                                      setCreateProjectForWs(null);
                                      qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
                                      qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
                                    },
                                    onError: (err) => {
                                      toast({ type: 'error', title: 'Failed to create project', description: (err as Error).message });
                                    },
                                  },
                                );
                              }}
                            >
                              {createProjectMutation.isPending ? 'Creating...' : 'Create'}
                            </Button>
                            <button onClick={() => setCreateProjectForWs(null)} className="text-surface-400 hover:text-surface-200">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Spaces within this workspace */}
                        {wsSpaces.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Spaces</h4>
                            {wsSpaces.map((space) => (
                              <div key={space.id} className="rounded-lg border border-surface-700 bg-surface-800/30 p-3">
                                <div className="flex items-center gap-3 mb-2">
                                  <Circle
                                    className="h-3.5 w-3.5 shrink-0"
                                    fill={space.color || '#4ade80'}
                                    stroke={space.color || '#4ade80'}
                                  />
                                  <span className="font-medium text-sm text-surface-100">{space.name}</span>
                                  <span className="rounded-full bg-surface-700 px-2 py-0.5 text-[10px] text-surface-400">
                                    {space._count.projects} project{space._count.projects !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {space.projects.length > 0 ? (
                                  <div className="space-y-1.5 ml-6">
                                    {space.projects.map((project) => (
                                      <div
                                        key={project.id}
                                        className="flex items-center justify-between rounded-lg border border-surface-700/60 bg-surface-900/40 px-3 py-1.5"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FolderKanban className="h-3 w-3 text-surface-500" />
                                          <span className="text-xs text-surface-200">{project.name}</span>
                                          <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] text-surface-500">
                                            {project.key}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() =>
                                            assignProjectSpaceMutation.mutate({ projectId: project.id, spaceId: null })
                                          }
                                          title="Remove from space"
                                          className="text-red-400/50 hover:text-red-400 transition-colors"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs italic text-surface-500 ml-6">No projects in this space</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Unassigned projects in this workspace */}
                        {unassignedProjects.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                              Unassigned Projects
                            </h4>
                            {unassignedProjects.map((project) => (
                              <div
                                key={project.id}
                                className="flex items-center justify-between rounded-lg border border-surface-700/60 bg-surface-800/20 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <FolderKanban className="h-3.5 w-3.5 text-surface-500" />
                                  <span className="text-sm text-surface-200">{project.name}</span>
                                  <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] text-surface-500">
                                    {project.key}
                                  </span>
                                </div>
                                {wsSpaces.length > 0 && (
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        assignProjectSpaceMutation.mutate({
                                          projectId: project.id,
                                          spaceId: e.target.value,
                                        });
                                      }
                                    }}
                                    className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  >
                                    <option value="">Move to space...</option>
                                    {wsSpaces.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Empty state */}
                        {wsSpaces.length === 0 && unassignedProjects.length === 0 && (
                          <p className="text-sm text-surface-500 text-center py-2">
                            No spaces or projects yet. Use the buttons above to create some.
                          </p>
                        )}
                      </CardBody>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardBody>
                <p className="text-center text-surface-500 py-4">
                  No workspaces found. Create one to get started.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Delete workspace confirmation modal */}
          {deleteWsTarget && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
              <Card className="w-full max-w-md">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-400">Delete Workspace</h3>
                  <p className="text-sm text-surface-400">
                    Are you sure you want to delete{' '}
                    <span className="font-medium text-surface-200">{deleteWsTarget.name}</span>?
                    This will permanently remove the workspace and all its projects, tasks, and data.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setDeleteWsTarget(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deleteWorkspaceMutation.isPending}
                      onClick={() => deleteWorkspaceMutation.mutate(deleteWsTarget.id)}
                    >
                      {deleteWorkspaceMutation.isPending ? 'Deleting...' : 'Delete Workspace'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── SMTP Settings Tab ─────────────────────────────────────── */}
      {activeTab === 'smtp' && (
        <div className="space-y-4 max-w-2xl">
          {/* Status indicator */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-sm font-medium text-surface-200">Email Configuration Status</p>
                  {smtpLoading ? (
                    <p className="text-xs text-surface-500">Checking...</p>
                  ) : smtpData?.configured ? (
                    <p className="text-xs text-green-400">SMTP is configured and active</p>
                  ) : (
                    <p className="text-xs text-yellow-400">SMTP is not configured -- email notifications are disabled</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* SMTP Settings Form */}
          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">SMTP Settings</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="smtp.example.com"
                    className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 0 })}
                    placeholder="587"
                    className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={smtpForm.secure}
                    onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-surface-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-surface-400 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:bg-white" />
                </label>
                <span className="text-sm text-surface-300">Use TLS/SSL (port 465 or 587)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400">Username</label>
                  <input
                    type="text"
                    value={smtpForm.username}
                    onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400">Password</label>
                  <input
                    type="password"
                    value={smtpForm.password}
                    onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                    placeholder="App password or SMTP password"
                    className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400">From Name</label>
                  <input
                    type="text"
                    value={smtpForm.fromName}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                    placeholder="Project Management"
                    className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400">From Email</label>
                  <input
                    type="email"
                    value={smtpForm.fromEmail}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                    placeholder="noreply@example.com"
                    className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!smtpForm.host || !smtpForm.port || saveSmtpMutation.isPending}
                  onClick={() => saveSmtpMutation.mutate()}
                >
                  {saveSmtpMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={testSmtpMutation.isPending || !smtpData?.configured}
                  onClick={() => testSmtpMutation.mutate()}
                >
                  {testSmtpMutation.isPending ? 'Sending...' : 'Test Connection'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Branding Tab ──────────────────────────────────────────── */}
      {activeTab === 'branding' && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardBody className="space-y-5">
              <h3 className="text-lg font-semibold text-surface-100">White Label / Branding</h3>
              <p className="text-sm text-surface-400">
                Customize the application branding globally across all workspaces.
              </p>

              {/* Organization Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400">Organization Name</label>
                <input
                  type="text"
                  value={brandingForm.orgName}
                  onChange={(e) => setBrandingForm({ ...brandingForm, orgName: e.target.value })}
                  placeholder="Your Organization"
                  className="w-full max-w-md rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Primary Color */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400">Primary Color</label>
                <div className="flex items-center gap-3 max-w-md">
                  <input
                    type="color"
                    value={brandingForm.primaryColor}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-surface-700 bg-surface-900 p-0.5"
                  />
                  <input
                    type="text"
                    value={brandingForm.primaryColor}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                    className="flex-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400">Logo</label>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-surface-600 bg-surface-900 text-surface-500 text-xs overflow-hidden">
                    {branding?.logoUrl ? (
                      <img
                        src={branding.logoUrl.startsWith('http') ? branding.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}${branding.logoUrl}`}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      'Logo'
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadLogo.mutate(file, {
                          onSuccess: () => toast({ type: 'success', title: 'Logo uploaded' }),
                          onError: (err) => toast({ type: 'error', title: 'Upload failed', description: (err as Error).message }),
                        });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => logoInputRef.current?.click()}
                    loading={uploadLogo.isPending}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload Logo
                  </Button>
                </div>
              </div>

              {/* Favicon Upload */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400">Favicon</label>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-surface-600 bg-surface-900 text-surface-500 text-xs overflow-hidden">
                    {branding?.faviconUrl ? (
                      <img
                        src={branding.faviconUrl.startsWith('http') ? branding.faviconUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}${branding.faviconUrl}`}
                        alt="Favicon"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      'ico'
                    )}
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadFavicon.mutate(file, {
                          onSuccess: () => toast({ type: 'success', title: 'Favicon uploaded' }),
                          onError: (err) => toast({ type: 'error', title: 'Upload failed', description: (err as Error).message }),
                        });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => faviconInputRef.current?.click()}
                    loading={uploadFavicon.isPending}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload Favicon
                  </Button>
                </div>
              </div>

              {/* Login Background */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-surface-400">Login Page Background</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '', label: 'None', style: 'bg-surface-950' },
                    { id: 'gradient-mesh', label: 'Mesh', style: '' },
                    { id: 'gradient-aurora', label: 'Aurora', style: '' },
                    { id: 'gradient-cosmic', label: 'Cosmic', style: '' },
                    { id: 'gradient-ocean', label: 'Ocean', style: '' },
                    { id: 'gradient-sunset', label: 'Sunset', style: '' },
                    { id: 'gradient-forest', label: 'Forest', style: '' },
                    { id: 'gradient-slate', label: 'Slate', style: '' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setBrandingForm({ ...brandingForm, loginBackground: bg.id })}
                      className={cn(
                        'relative h-20 rounded-lg border-2 overflow-hidden transition-all',
                        brandingForm.loginBackground === bg.id
                          ? 'border-primary-500 ring-1 ring-primary-500/50'
                          : 'border-surface-700 hover:border-surface-600',
                      )}
                    >
                      <div className={cn('absolute inset-0', bg.style)} style={bg.id ? getBackgroundStyle(bg.id) : undefined} />
                      <span className="relative z-10 text-[10px] font-medium text-surface-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* App Background */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-surface-400">App Background</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '', label: 'Default', style: 'bg-surface-950' },
                    { id: 'app-subtle-grid', label: 'Grid', style: '' },
                    { id: 'app-subtle-dots', label: 'Dots', style: '' },
                    { id: 'app-gradient-dark', label: 'Gradient', style: '' },
                    { id: 'app-noise', label: 'Texture', style: '' },
                    { id: 'app-mesh-dark', label: 'Mesh', style: '' },
                    { id: 'app-vignette', label: 'Vignette', style: '' },
                    { id: 'app-deep-space', label: 'Deep Space', style: '' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setBrandingForm({ ...brandingForm, appBackground: bg.id })}
                      className={cn(
                        'relative h-20 rounded-lg border-2 overflow-hidden transition-all',
                        brandingForm.appBackground === bg.id
                          ? 'border-primary-500 ring-1 ring-primary-500/50'
                          : 'border-surface-700 hover:border-surface-600',
                      )}
                    >
                      <div className={cn('absolute inset-0', bg.style)} style={bg.id ? getBackgroundStyle(bg.id) : undefined} />
                      <span className="relative z-10 text-[10px] font-medium text-surface-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <Button
                variant="primary"
                size="sm"
                loading={updateBranding.isPending}
                onClick={() => {
                  updateBranding.mutate(brandingForm, {
                    onSuccess: () => toast({ type: 'success', title: 'Branding settings saved' }),
                    onError: (err) => toast({ type: 'error', title: 'Failed to save branding', description: (err as Error).message }),
                  });
                }}
              >
                Save Branding
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Authentication Tab ──────────────────────────────────── */}
      {activeTab === 'auth' && (
        <div className="space-y-6">
          {/* Registration toggle */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-surface-200">Public Registration</h3>
                  <p className="mt-0.5 text-xs text-surface-400">
                    When disabled, the &quot;Create account&quot; link on the login page is hidden,
                    the /register page redirects to /login, and the register API is blocked.
                    Admins can still create users from the Users tab.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!(appSettings?.hidePublicRegistration ?? false)}
                  onClick={() => toggleHideRegistration.mutate(!appSettings?.hidePublicRegistration)}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    appSettings?.hidePublicRegistration ? 'bg-surface-600' : 'bg-primary-500',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                      appSettings?.hidePublicRegistration ? 'translate-x-0' : 'translate-x-5',
                    )}
                  />
                </button>
              </div>
            </CardBody>
          </Card>
          <AuthProvidersPanel />
        </div>
      )}
    </div>
  );
}

// ── Auth Providers Admin Panel ────────────────────────────────────

type ProviderType = 'GOOGLE' | 'MICROSOFT' | 'OIDC';

const PROVIDER_INFO: Record<ProviderType, { label: string; description: string; fields: string[]; callbackPath: string; steps: string[] }> = {
  GOOGLE: {
    label: 'Google',
    description: 'Allow users to sign in with their Google accounts.',
    fields: ['clientId', 'clientSecret'],
    callbackPath: '/api/v1/auth/google/callback',
    steps: [
      'Go to the Google Cloud Console (console.cloud.google.com)',
      'Create a new project or select an existing one',
      'Navigate to APIs & Services > Credentials',
      'Click "Create Credentials" > "OAuth client ID"',
      'Select "Web application" as the application type',
      'Add your app URL to "Authorized JavaScript origins"',
      'Add the Redirect URI shown below to "Authorized redirect URIs"',
      'Copy the Client ID and Client Secret into the fields below',
    ],
  },
  MICROSOFT: {
    label: 'Microsoft',
    description: 'Allow users to sign in with Microsoft / Azure AD accounts.',
    fields: ['clientId', 'clientSecret', 'tenantId'],
    callbackPath: '/api/v1/auth/microsoft/callback',
    steps: [
      'Go to the Azure Portal (portal.azure.com)',
      'Navigate to Azure Active Directory > App registrations',
      'Click "New registration"',
      'Set "Supported account types" based on your needs (single tenant or multi-tenant)',
      'Add the Redirect URI shown below as a "Web" platform redirect URI',
      'Under "Certificates & secrets", create a new client secret',
      'Copy the Application (client) ID and secret value into the fields below',
      'Optionally enter your Directory (tenant) ID — leave blank for multi-tenant ("common")',
    ],
  },
  OIDC: {
    label: 'OIDC (Okta, Auth0, etc.)',
    description: 'Allow users to sign in with any OpenID Connect provider.',
    fields: ['clientId', 'clientSecret', 'issuerUrl'],
    callbackPath: '/api/v1/auth/oidc/callback',
    steps: [
      'Create a new "Web Application" in your OIDC provider (Okta, Auth0, Keycloak, etc.)',
      'Set the sign-in redirect URI to the Redirect URI shown below',
      'Copy the Client ID, Client Secret, and Issuer URL into the fields below',
      'The Issuer URL must support OpenID Connect Discovery (/.well-known/openid-configuration)',
      'For Okta: the issuer URL looks like https://your-org.okta.com/oauth2/default',
      'For Auth0: the issuer URL looks like https://your-tenant.auth0.com',
    ],
  },
};

function AuthProvidersPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['admin', 'auth-providers'],
    queryFn: () => adminApi.listAuthProviders(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: UpsertAuthProviderData) => adminApi.upsertAuthProvider(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'auth-providers'] });
      toast({ type: 'success', title: 'Provider saved' });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to save provider', description: (err as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => adminApi.deleteAuthProvider(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'auth-providers'] });
      toast({ type: 'success', title: 'Provider removed' });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to remove provider', description: (err as Error).message }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-700 border-t-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-surface-100">SSO / OAuth Providers</h2>
        <p className="text-sm text-surface-400">
          Configure single sign-on providers. Users will see SSO buttons on the login and register pages.
        </p>
      </div>
      {(['GOOGLE', 'MICROSOFT', 'OIDC'] as ProviderType[]).map((providerType) => (
        <AuthProviderCard
          key={providerType}
          providerType={providerType}
          existing={providers?.find((p: OAuthProviderConfig) => p.provider === providerType) || null}
          onSave={(data) => upsertMutation.mutate(data)}
          onDelete={() => deleteMutation.mutate(providerType)}
          saving={upsertMutation.isPending}
        />
      ))}
    </div>
  );
}

function AuthProviderCard({
  providerType,
  existing,
  onSave,
  onDelete,
  saving,
}: {
  providerType: ProviderType;
  existing: OAuthProviderConfig | null;
  onSave: (data: UpsertAuthProviderData) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const info = PROVIDER_INFO[providerType];
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    clientId: existing?.clientId || '',
    clientSecret: existing?.clientSecret || '',
    tenantId: existing?.tenantId || '',
    issuerUrl: existing?.issuerUrl || '',
    enabled: existing?.enabled ?? false,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        clientId: existing.clientId || '',
        clientSecret: existing.clientSecret || '',
        tenantId: existing.tenantId || '',
        issuerUrl: existing.issuerUrl || '',
        enabled: existing.enabled,
      });
    }
  }, [existing?.id]);

  const handleSave = () => {
    onSave({
      provider: providerType,
      clientId: form.clientId,
      clientSecret: form.clientSecret,
      tenantId: providerType === 'MICROSOFT' ? (form.tenantId || null) : null,
      issuerUrl: providerType === 'OIDC' ? (form.issuerUrl || null) : null,
      enabled: form.enabled,
    });
  };

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-surface-100">{info.label}</span>
              {existing?.enabled && (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                  Active
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-surface-400 hover:text-surface-200"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-surface-500">{info.description}</p>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-surface-700 pt-4">
            {/* Setup instructions */}
            <div className="rounded-lg border border-surface-600 bg-surface-800/50 p-3">
              <h4 className="text-xs font-semibold text-surface-200 uppercase tracking-wider mb-2">Setup Instructions</h4>
              <ol className="list-decimal list-inside space-y-1 text-xs text-surface-400">
                {info.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Redirect URI */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Redirect URI (copy this into your provider)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-primary-300 font-mono select-all overflow-x-auto">
                  {window.location.origin}{info.callbackPath}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}${info.callbackPath}`);
                  }}
                  className="shrink-0 rounded-lg border border-surface-600 bg-surface-700 px-2.5 py-2 text-xs text-surface-300 hover:bg-surface-600 hover:text-surface-100 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-surface-200">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="rounded border-surface-600 bg-surface-700"
              />
              Enabled
            </label>

            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Client ID</label>
              <input
                type="text"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full rounded-lg border border-surface-600 bg-surface-700 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:outline-none"
                placeholder="Your OAuth client ID"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Client Secret</label>
              <input
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                className="w-full rounded-lg border border-surface-600 bg-surface-700 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:outline-none"
                placeholder="Your OAuth client secret"
              />
            </div>

            {providerType === 'MICROSOFT' && (
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Tenant ID (optional)</label>
                <input
                  type="text"
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                  className="w-full rounded-lg border border-surface-600 bg-surface-700 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:outline-none"
                  placeholder="Azure AD tenant ID (leave blank for 'common')"
                />
              </div>
            )}

            {providerType === 'OIDC' && (
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Issuer URL</label>
                <input
                  type="text"
                  value={form.issuerUrl}
                  onChange={(e) => setForm({ ...form, issuerUrl: e.target.value })}
                  className="w-full rounded-lg border border-surface-600 bg-surface-700 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:outline-none"
                  placeholder="https://your-provider.com"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={saving}
              >
                Save
              </Button>
              {existing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
