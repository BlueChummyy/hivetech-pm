import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketContext } from '@/providers/SocketProvider';
import { useSocketRoom } from './useSocketRoom';

export function useWorkspaceSocketEvents(workspaceId: string | undefined) {
  const socket = useSocketContext();
  const queryClient = useQueryClient();

  useSocketRoom('workspace', workspaceId);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    const handleProjectChange = () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleWorkspaceChange = () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
    };

    const handleMemberChange = () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
    };

    // Task changes affect project task counts in sidebar and dashboard stats
    const handleTaskChange = () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', workspaceId] });
    };

    // Space changes affect sidebar space list
    const handleSpaceChange = () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    };

    socket.on('project:created', handleProjectChange);
    socket.on('project:updated', handleProjectChange);
    socket.on('project:deleted', handleProjectChange);
    socket.on('workspace:updated', handleWorkspaceChange);
    socket.on('workspace:member:added', handleMemberChange);
    socket.on('workspace:member:updated', handleMemberChange);
    socket.on('workspace:member:removed', handleMemberChange);
    socket.on('task:created', handleTaskChange);
    socket.on('task:updated', handleTaskChange);
    socket.on('task:deleted', handleTaskChange);
    socket.on('space:created', handleSpaceChange);
    socket.on('space:updated', handleSpaceChange);
    socket.on('space:deleted', handleSpaceChange);

    return () => {
      socket.off('project:created', handleProjectChange);
      socket.off('project:updated', handleProjectChange);
      socket.off('project:deleted', handleProjectChange);
      socket.off('workspace:updated', handleWorkspaceChange);
      socket.off('workspace:member:added', handleMemberChange);
      socket.off('workspace:member:updated', handleMemberChange);
      socket.off('workspace:member:removed', handleMemberChange);
      socket.off('task:created', handleTaskChange);
      socket.off('task:updated', handleTaskChange);
      socket.off('task:deleted', handleTaskChange);
      socket.off('space:created', handleSpaceChange);
      socket.off('space:updated', handleSpaceChange);
      socket.off('space:deleted', handleSpaceChange);
    };
  }, [socket, workspaceId, queryClient]);
}
