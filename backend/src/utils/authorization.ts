import { prisma } from '../prisma/client.js';
import { ApiError } from './api-error.js';

export async function requireWorkspaceMember(workspaceId: string, userId: string, requiredRoles?: string[]) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw ApiError.forbidden('Not a member of this workspace');
  if (requiredRoles && !requiredRoles.includes(member.role)) {
    throw ApiError.forbidden('Insufficient permissions');
  }
  return member;
}

export async function requireProjectMember(projectId: string, userId: string, requiredRoles?: string[]) {
  // First check project membership
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (member) {
    if (requiredRoles && !requiredRoles.includes(member.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    return member;
  }

  // Fall back to workspace membership
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) throw ApiError.notFound('Project not found');

  const wsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!wsMember) throw ApiError.forbidden('Not a member of this project or workspace');

  // If specific project roles are required, workspace members only get access
  // if they have a high enough workspace role
  if (requiredRoles && requiredRoles.length > 0) {
    // Workspace OWNER/ADMIN can do anything; otherwise deny
    if (!['OWNER', 'ADMIN'].includes(wsMember.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
  }

  return wsMember;
}
