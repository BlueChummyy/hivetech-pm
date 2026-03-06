import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketContext } from '@/providers/SocketProvider';
import { useSocketRoom } from './useSocketRoom';

export function useProjectSocketEvents(projectId: string | undefined) {
  const socket = useSocketContext();
  const queryClient = useQueryClient();

  // Join the project room
  useSocketRoom('project', projectId);

  useEffect(() => {
    if (!socket || !projectId) return;

    // Task events
    const handleTaskCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };
    const handleTaskUpdated = (data?: { id?: string; taskId?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Also invalidate the specific task detail and its activity feed
      const taskId = data?.id || data?.taskId;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
        queryClient.invalidateQueries({ queryKey: ['activity', { taskId }] });
      }
    };
    const handleTaskDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    // Status events
    const handleStatusChange = () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', { projectId }] });
    };

    // Comment events
    const handleCommentChange = () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    // Label events
    const handleLabelChange = () => {
      queryClient.invalidateQueries({ queryKey: ['labels', { projectId }] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    // Attachment events
    const handleAttachmentChange = () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
    };

    // Member events
    const handleMemberChange = () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    };

    // Register listeners
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('status:created', handleStatusChange);
    socket.on('status:updated', handleStatusChange);
    socket.on('status:deleted', handleStatusChange);
    socket.on('comment:created', handleCommentChange);
    socket.on('comment:updated', handleCommentChange);
    socket.on('comment:deleted', handleCommentChange);
    socket.on('label:created', handleLabelChange);
    socket.on('label:updated', handleLabelChange);
    socket.on('label:deleted', handleLabelChange);
    socket.on('label:attached', handleLabelChange);
    socket.on('label:detached', handleLabelChange);
    socket.on('attachment:created', handleAttachmentChange);
    socket.on('attachment:deleted', handleAttachmentChange);
    socket.on('member:added', handleMemberChange);
    socket.on('member:removed', handleMemberChange);
    socket.on('member:updated', handleMemberChange);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('status:created', handleStatusChange);
      socket.off('status:updated', handleStatusChange);
      socket.off('status:deleted', handleStatusChange);
      socket.off('comment:created', handleCommentChange);
      socket.off('comment:updated', handleCommentChange);
      socket.off('comment:deleted', handleCommentChange);
      socket.off('label:created', handleLabelChange);
      socket.off('label:updated', handleLabelChange);
      socket.off('label:deleted', handleLabelChange);
      socket.off('label:attached', handleLabelChange);
      socket.off('label:detached', handleLabelChange);
      socket.off('attachment:created', handleAttachmentChange);
      socket.off('attachment:deleted', handleAttachmentChange);
      socket.off('member:added', handleMemberChange);
      socket.off('member:removed', handleMemberChange);
      socket.off('member:updated', handleMemberChange);
    };
  }, [socket, projectId, queryClient]);
}
