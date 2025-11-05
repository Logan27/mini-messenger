import React from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';

interface ReconnectingIndicatorProps {
  isConnected: boolean;
  isReconnecting: boolean;
  className?: string;
}

/**
 * ReconnectingIndicator Component
 * 
 * Shows status banner when WebSocket is disconnected or attempting to reconnect.
 * Integrates with SocketContext to display real-time connection status.
 * 
 * @example
 * ```tsx
 * const { connected, reconnecting } = useSocket();
 * 
 * <ReconnectingIndicator 
 *   isConnected={connected}
 *   isReconnecting={reconnecting}
 * />
 * ```
 */
export const ReconnectingIndicator: React.FC<ReconnectingIndicatorProps> = ({
  isConnected,
  isReconnecting,
  className
}) => {
  // Don't show anything if connected and not reconnecting
  if (isConnected && !isReconnecting) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-16 left-1/2 -translate-x-1/2 z-40',
        'transform transition-all duration-300 ease-in-out',
        className
      )}
    >
      <Alert
        variant="default"
        className={cn(
          'shadow-lg border',
          isReconnecting
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
            : 'bg-destructive/10 border-destructive/20 text-destructive'
        )}
      >
        {isReconnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="ml-2 font-medium">
              Reconnecting to server...
            </AlertDescription>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="ml-2 font-medium">
              Disconnected from server
            </AlertDescription>
          </>
        )}
      </Alert>
    </div>
  );
};

export default ReconnectingIndicator;
