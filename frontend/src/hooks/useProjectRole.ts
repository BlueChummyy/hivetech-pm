import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useProjectMembers } from './useMembers';
import type { ProjectRole } from '@/types/models.types';

const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 5,
  PROJECT_MANAGER: 4,
  TEAM_MEMBER: 3,
  VIEWER: 2,
  GUEST: 1,
};

export function useProjectRole(projectId: string | undefined) {
  const { user } = useAuth();
  const { data: members } = useProjectMembers(projectId || '');

  const role = useMemo(() => {
    if (!user || !members) return null;
    const membership = members.find((m) => m.userId === user.id);
    return (membership?.role as ProjectRole) || null;
  }, [user, members]);

  return role;
}

export function hasMinRole(userRole: string | null, requiredRole: string): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? Infinity);
}

export function useProjectPermissions(projectId: string | undefined) {
  const role = useProjectRole(projectId);

  return useMemo(() => ({
    role,
    canView: hasMinRole(role, 'GUEST'),
    canComment: hasMinRole(role, 'TEAM_MEMBER'),
    canEditTasks: hasMinRole(role, 'TEAM_MEMBER'),
    canChangeStatus: hasMinRole(role, 'TEAM_MEMBER'),
    canCompleteTasks: hasMinRole(role, 'PROJECT_MANAGER'),
    canCreateTasks: hasMinRole(role, 'TEAM_MEMBER'),
    canAssignTasks: hasMinRole(role, 'PROJECT_MANAGER'),
    canAssignDates: hasMinRole(role, 'PROJECT_MANAGER'),
    canDeleteTasks: hasMinRole(role, 'PROJECT_MANAGER'),
    canManageProject: hasMinRole(role, 'ADMIN'),
  }), [role]);
}
