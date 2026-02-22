import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import { workspacesApi } from '@/api/workspaces';
import type { ProjectMember } from '@/types/models.types';
import { ProjectRole } from '@/types/models.types';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';

interface ProjectMembersProps {
  projectId: string;
  workspaceId: string;
  members: ProjectMember[];
}

const ROLE_OPTIONS = [
  { value: ProjectRole.ADMIN, label: 'Admin' },
  { value: ProjectRole.PROJECT_MANAGER, label: 'Project Manager' },
  { value: ProjectRole.TEAM_MEMBER, label: 'Team Member' },
  { value: ProjectRole.VIEWER, label: 'Viewer' },
  { value: ProjectRole.GUEST, label: 'Guest' },
];

export function ProjectMembers({ projectId, workspaceId, members }: ProjectMembersProps) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: searchResults } = useQuery({
    queryKey: ['workspace-members', workspaceId, { search }],
    queryFn: () => workspacesApi.listMembers(workspaceId, { search }),
    enabled: adding,
  });

  const addMember = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      projectsApi.addMember(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      setAdding(false);
      setSearch('');
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to add member', description: (err as Error).message });
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      projectsApi.updateMember(projectId, memberId, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to update role', description: (err as Error).message });
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => projectsApi.removeMember(projectId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      setConfirmRemove(null);
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to remove member', description: (err as Error).message });
    },
  });

  const existingUserIds = new Set(members.map((m) => m.userId));
  const filteredResults = searchResults?.filter((wm) => !existingUserIds.has(wm.userId)) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-surface-300">
          Members ({members.length})
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setAdding(!adding)}>
          <UserPlus className="h-4 w-4" />
          Add member
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border border-surface-700 bg-surface-900 p-3 space-y-2">
          <input
            type="text"
            placeholder="Search workspace members by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          {filteredResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredResults.map((wm) => (
                <button
                  key={wm.userId}
                  onClick={() =>
                    addMember.mutate({ userId: wm.userId, role: ProjectRole.TEAM_MEMBER })
                  }
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
                >
                  <Avatar src={wm.user?.avatarUrl} name={wm.user?.name || wm.user?.displayName} size="sm" />
                  <span>{wm.user?.name || wm.user?.displayName}</span>
                  <span className="text-xs text-surface-500">{wm.user?.email}</span>
                </button>
              ))}
            </div>
          )}
          {filteredResults.length === 0 && searchResults && (
            <p className="text-sm text-surface-500 px-1">No workspace members found</p>
          )}
        </div>
      )}

      <div className="space-y-1">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-800/50"
          >
            <Avatar src={member.user?.avatarUrl} name={member.user?.name || member.user?.displayName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">
                {member.user?.name || member.user?.displayName || 'Unknown'}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {member.user?.email}
              </p>
            </div>
            <select
              value={member.role}
              onChange={(e) =>
                updateRole.mutate({ memberId: member.userId, role: e.target.value })
              }
              className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {confirmRemove === member.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => removeMember.mutate(member.userId)}
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
