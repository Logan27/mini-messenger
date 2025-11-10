import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { usePWARegistration } from '@/services/pwa.service';

/**
 * PWAUpdatePrompt Component
 *
 * Displays a prompt when a new version of the service worker is available,
 * allowing users to reload the app to get the latest updates.
 */
export const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = usePWARegistration();

  const handleUpdate = async () => {
    await updateServiceWorker(true);
    setNeedRefresh(false);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-50 animate-in slide-in-from-top-5 md:left-auto md:right-4 md:max-w-md">
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
        <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="ml-2 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Update Available
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              A new version is ready. Reload to update?
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              Later
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleUpdate}
              className="h-8 bg-blue-600 hover:bg-blue-700"
            >
              Reload
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PWAUpdatePrompt;
