import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  className?: string;
}

/**
 * OfflineBanner Component
 * 
 * Displays a banner when the user loses network connection
 * and automatically hides when connection is restored.
 * 
 * @example
 * ```tsx
 * <OfflineBanner />
 * ```
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  // Active ping to verify connection
  const checkConnectivity = async () => {
    try {
      const response = await fetch('http://localhost:4000/health', { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      // Verify with a ping before showing restored
      const isActuallyOnline = await checkConnectivity();
      if (isActuallyOnline) {
        setIsOnline(true);
        setShowReconnected(true);

        // Hide "reconnected" message after 3 seconds
        setTimeout(() => {
          setShowReconnected(false);
        }, 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    // Periodic check to prevent false positives
    const interval = setInterval(async () => {
      if (!navigator.onLine && isOnline) {
        setIsOnline(false);
      } else if (navigator.onLine && !isOnline) {
        const back = await checkConnectivity();
        if (back) handleOnline();
      }
    }, 5000);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  // Don't render anything if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'transform transition-transform duration-300 ease-in-out',
        className
      )}
    >
      {!isOnline ? (
        // Offline banner
        <Alert
          variant="destructive"
          className="rounded-none border-x-0 border-t-0 shadow-md"
        >
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="ml-2 flex items-center justify-between">
            <span className="font-medium">
              No internet connection
            </span>
            <span className="text-sm opacity-90">
              Trying to reconnect...
            </span>
          </AlertDescription>
        </Alert>
      ) : (
        // Reconnected banner
        <Alert
          variant="default"
          className="rounded-none border-x-0 border-t-0 shadow-md bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
        >
          <Wifi className="h-4 w-4" />
          <AlertDescription className="ml-2 font-medium">
            Connection restored
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default OfflineBanner;
