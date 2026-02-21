import { useEffect } from 'react';
import { useSocketContext } from '@/providers/SocketProvider';

export function useSocketRoom(roomType: 'workspace' | 'project' | 'user', roomId: string | null | undefined) {
  const socket = useSocketContext();

  useEffect(() => {
    if (!socket || !roomId) return;

    const joinEvent = `join:${roomType}`;
    const leaveEvent = `leave:${roomType}`;

    socket.emit(joinEvent, roomId);

    return () => {
      socket.emit(leaveEvent, roomId);
    };
  }, [socket, roomType, roomId]);
}
