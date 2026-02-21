import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken]);

  return socketRef.current;
}
