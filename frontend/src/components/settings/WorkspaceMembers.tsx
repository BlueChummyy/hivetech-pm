import { useState } from 'react';
import { Trash2, UserCircle, UserPlus } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { workspacesApi } from '@/api/workspaces';
import { usersApi } from '@/api/users';
import type { WorkspaceMember } from '@/types/models.types';
import { WorkspaceRole } from '@/types/models.types';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface WorkspaceMembersProps {
  workspaceId: string;
  members: WorkspaceMember[];
}

const ROLE_OPTIONS = [
  { value: WorkspaceRole.ADMIN, label: 'Admin' },
  { value: WorkspaceRole.MEMBER, label: 'Member' },
  { value: WorkspaceRole.VIEWER, label: 'Viewer' },
];

export function WorkspaceMembers({ workspaceId, members }: WorkspaceMembersProps) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: searchResults } = useQuery({
    queryKey: ['users', { search }],
    queryFn: () => usersApi.list({ search }),
    enabled: adding && search.length >= 2,
  });

  const addMember = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      workspacesApi.addMember(workspaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] });
      setAdding(false);
      setSearch('');
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to add member', description: (err as Error).message });
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      workspacesApi.updateMember(workspaceId, memberId, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update role', description: (err as Error).message });
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      workspacesApi.removeMember(workspaceId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] });
      setConfirmRemove(null);
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to remove member', description: (err as Error).message });
    },
  });

  const existingUserIds = new Set(members.map((m) => m.userId));
  const filteredResults = searchResults?.filter((u) => !existingUserIds.has(u.id)) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-surface-300">
          Members ({members.length})
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setAdding(!adding)}>
          <UserPlus className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border border-surface-700 bg-surface-900 p-3 space-y-2">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          {filteredResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() =>
                    addMember.mutate({
                      userId: user.id,
                      role: WorkspaceRole.MEMBER,
                    })
                  }
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-6 w-6 text-surface-500" />
                  )}
                  <span>{user.name}</span>
                  <span className="text-xs text-surface-500">{user.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {members.map((member) => {
          const isOwner = member.role === WorkspaceRole.OWNER;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-800/50"
            >
              {member.user?.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <UserCircle className="h-8 w-8 text-surface-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">
                  {member.user?.name || 'Unknown'}
                </p>
                <p className="text-xs text-surface-500 truncate">
                  {member.user?.email}
                </p>
              </div>
              {isOwner ? (
                <span className="rounded-md bg-primary-600/20 px-2 py-0.5 text-xs font-medium text-primary-400">
                  Owner
                </span>
              ) : (
                <select
                  value={member.role}
                  onChange={(e) =>
                    updateRole.mutate({ memberId: member.id, role: e.target.value })
                  }
                  className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {!isOwner &&
                (confirmRemove === member.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => removeMember.mutate(member.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="rounded px-2 py-1 text-xs text-surface-400 hover:bg-surface-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemove(member.id)}
                    className="rounded-md p-1.5 text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
