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
} from 'lucide-react';
import { adminApi, type AdminUser } from '@/api/admin';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useWorkspaceStore } from '@/store/workspace.store';
import { cn } from '@/utils/cn';

type Tab = 'users' | 'create' ;

const WORKSPACE_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'VIEWER', label: 'Viewer' },
];

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  // ── Users list ───────────────────────────────────────────────────
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.listUsers({ search: search || undefined, limit: 100 }),
  });

  // ── Create user form ─────────────────────────────────────────────
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    workspaceRole: 'MEMBER' as 'ADMIN' | 'MEMBER' | 'VIEWER',
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

  // ── Update role ──────────────────────────────────────────────────
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateRole(userId, activeWorkspaceId!, role),
    onSuccess: () => {
      toast({ type: 'success', title: 'Role updated' });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update role', description: (err as Error).message });
    },
  });

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'create', label: 'Create User', icon: UserPlus },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary-400" />
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          Manage users, roles, and permissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">Workspace Role</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-surface-700/50">
                        <td className="px-4 py-3" colSpan={4}>
                          <div className="h-5 w-full animate-pulse rounded bg-surface-700" />
                        </td>
                      </tr>
                    ))
                  ) : usersData?.users && usersData.users.length > 0 ? (
                    usersData.users.map((user) => {
                      const wsRole = user.workspaceMembers?.find(
                        (m) => m.workspace.id === activeWorkspaceId,
                      )?.role;
                      const isOwner = wsRole === 'OWNER';

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
                            {isOwner ? (
                              <span className="rounded-md bg-primary-600/20 px-2 py-0.5 text-xs font-medium text-primary-400">
                                Owner
                              </span>
                            ) : wsRole ? (
                              <select
                                value={wsRole}
                                onChange={(e) =>
                                  updateRoleMutation.mutate({
                                    userId: user.id,
                                    role: e.target.value,
                                  })
                                }
                                className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                {WORKSPACE_ROLES.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-surface-500">Not in workspace</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setResetTarget(user);
                                setResetPassword('');
                                setShowResetPassword(false);
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <Card className="w-full max-w-md">
                <CardBody className="space-y-4">
                  <h3 className="text-lg font-semibold text-surface-100">Reset Password</h3>
                  <p className="text-sm text-surface-400">
                    Set a new password for <span className="font-medium text-surface-200">{resetTarget.name || `${resetTarget.firstName} ${resetTarget.lastName}`}</span> ({resetTarget.email})
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setResetTarget(null)}
                    >
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
                {WORKSPACE_ROLES.map((r) => (
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
