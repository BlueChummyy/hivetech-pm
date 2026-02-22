import { useState } from 'react';
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
} from 'lucide-react';
import { adminApi, type AdminUser } from '@/api/admin';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/utils/cn';

type Tab = 'users' | 'workspaces' | 'create';

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

  // ── Create user form ─────────────────────────────────────────────
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    workspaceRole: 'MEMBER' as 'ADMIN' | 'PROJECT_MANAGER' | 'MEMBER' | 'VIEWER',
  });
  const [showPassword, setShowPassword] = useState(false);

  const createUserMutation = useMutation({
    mutationFn: () => adminApi.createUser(newUser),
    onSuccess: () => {
      toast({ type: 'success', title: 'User created successfully' });
      setNewUser({ email: '', password: '', firstName: '', lastName: '', workspaceRole: 'MEMBER' });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActiveTab('users');
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to create user', description: (err as Error).message });
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

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'workspaces', label: 'Workspaces', icon: Building2 },
    { id: 'create', label: 'Create User', icon: UserPlus },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-100 flex items-center gap-3">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" />
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          Global administration — manage all users, workspaces, and permissions.
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
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 pl-10 pr-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
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
        </div>
      )}

      {/* ── Workspaces Tab ────────────────────────────────────────── */}
      {activeTab === 'workspaces' && (
        <div className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">Workspace</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">Owner</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-400">Members</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-400">Projects</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspacesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-surface-700/50">
                        <td className="px-4 py-3" colSpan={6}>
                          <div className="h-5 w-full animate-pulse rounded bg-surface-700" />
                        </td>
                      </tr>
                    ))
                  ) : workspacesData && workspacesData.length > 0 ? (
                    workspacesData.map((ws) => {
                      const owner = ws.members[0]?.user;
                      return (
                        <tr key={ws.id} className="border-b border-surface-700/50 hover:bg-surface-800/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/20 text-primary-400">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-surface-200">{ws.name}</p>
                                <p className="text-xs text-surface-500">{ws.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-surface-400">
                            {owner
                              ? `${owner.firstName} ${owner.lastName}`
                              : <span className="text-surface-500">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-surface-300">
                              <Users className="h-3.5 w-3.5 text-surface-500" />
                              {ws._count.members}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-surface-300">
                              <FolderKanban className="h-3.5 w-3.5 text-surface-500" />
                              {ws._count.projects}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-surface-400 text-xs">
                            {new Date(ws.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setDeleteWsTarget({ id: ws.id, name: ws.name })}
                              title="Delete Workspace"
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                        No workspaces found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

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

      {/* ── Create User Tab ───────────────────────────────────────── */}
      {activeTab === 'create' && (
        <Card className="max-w-lg">
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

            <div className="pt-2">
              <Button
                variant="primary"
                disabled={
                  !newUser.email ||
                  !newUser.firstName ||
                  !newUser.lastName ||
                  newUser.password.length < 8 ||
                  createUserMutation.isPending
                }
                onClick={() => createUserMutation.mutate()}
                className="w-full"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
