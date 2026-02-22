import { useState, useEffect } from 'react';
import { useSocketContext } from '@/providers/SocketProvider';
import { cn } from '@/utils/cn';

export function ConnectionStatus() {
  const socket = useSocketContext();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return;
    }

    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-surface-800/50 px-2.5 py-1 text-xs text-surface-500">
      <div className={cn(
        'h-1.5 w-1.5 rounded-full',
        connected ? 'bg-green-500' : 'bg-red-500'
      )} />
      {connected ? 'Connected' : 'Reconnecting...'}
    </div>
  );
}
