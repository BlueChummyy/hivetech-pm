import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketContext } from '@/providers/SocketProvider';
import { useAuthStore } from '@/store/auth.store';

// Simple toast event bus
let toastListeners: Array<(toast: ToastData) => void> = [];

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  resourceType?: string;
  resourceId?: string;
}

export function onToast(listener: (toast: ToastData) => void) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
}

function showToast(toast: ToastData) {
  toastListeners.forEach(l => l(toast));
}

export function useNotificationSocket() {
  const socket = useSocketContext();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = (notification: {
      id?: string;
      title?: string;
      message?: string;
      type?: string;
      resourceType?: string;
      resourceId?: string;
    }) => {
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show toast
      showToast({
        id: notification.id || crypto.randomUUID(),
        title: notification.title || 'Notification',
        message: notification.message || '',
        type: 'info',
        resourceType: notification.resourceType,
        resourceId: notification.resourceId,
      });
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket, user, queryClient]);
}
