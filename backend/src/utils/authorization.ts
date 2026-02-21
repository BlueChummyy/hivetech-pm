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
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw ApiError.forbidden('Not a member of this project');
  if (requiredRoles && !requiredRoles.includes(member.role)) {
    throw ApiError.forbidden('Insufficient permissions');
  }
  return member;
}
