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

    socket.on('project:created', handleProjectChange);
    socket.on('project:updated', handleProjectChange);
    socket.on('project:deleted', handleProjectChange);
    socket.on('workspace:updated', handleWorkspaceChange);
    socket.on('workspace:member:added', handleMemberChange);
    socket.on('workspace:member:updated', handleMemberChange);
    socket.on('workspace:member:removed', handleMemberChange);

    return () => {
      socket.off('project:created', handleProjectChange);
      socket.off('project:updated', handleProjectChange);
      socket.off('project:deleted', handleProjectChange);
      socket.off('workspace:updated', handleWorkspaceChange);
      socket.off('workspace:member:added', handleMemberChange);
      socket.off('workspace:member:updated', handleMemberChange);
      socket.off('workspace:member:removed', handleMemberChange);
    };
  }, [socket, workspaceId, queryClient]);
}
