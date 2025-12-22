import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { pwaService } from '@/services/pwa.service';
import { cn } from '@/lib/utils';

/**
 * PWAInstallPrompt Component
 *
 * Displays a prompt to install the app as a Progressive Web App (PWA)
 * when the browser indicates that installation is available.
 */
export const PWAInstallPrompt: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Subscribe to install prompt availability
    const unsubscribe = pwaService.subscribeToInstallPrompt((available) => {
      setCanInstall(available && !pwaService.isInstalled());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);

    const result = await pwaService.showInstallPrompt();

    if (result === 'accepted') {
      setCanInstall(false);
    } else if (result === 'dismissed') {
      handleDismiss();
    }

    setIsInstalling(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if not installable, already dismissed, or already installed
  if (!canInstall || isDismissed || pwaService.isInstalled()) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5',
        'md:left-auto md:right-4 md:max-w-md'
      )}
    >
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-sm">Install Mini Messenger</h3>
            <p className="text-xs text-muted-foreground">
              Get quick access and work offline
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleInstall}
              disabled={isInstalling}
              className="h-8"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;
