import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Smartphone, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import pushNotificationService from '@/services/pushNotificationService';

export default function PushNotificationSetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [fcmInitialized, setFcmInitialized] = useState(false);
  const [registeredTokens, setRegisteredTokens] = useState(0);
  const [isTesting, setIsTesting] = useState(false);

  // Check initial status
  useEffect(() => {
    checkStatus();
    checkBrowserPermission();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const status = await pushNotificationService.getPushNotificationStatus();
      setFcmInitialized(status.fcmInitialized);
      setRegisteredTokens(status.registeredTokens);
      setIsSetup(status.pushNotificationsAvailable);
      setIsEnabled(status.pushNotificationsAvailable);
    } catch (error: any) {
      console.error('Failed to check push notification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBrowserPermission = () => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      if (permission === 'granted' && !isSetup) {
        // Permission granted but not setup, try to setup
        handleSetup();
      }
    }
  };

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const result = await pushNotificationService.setupPushNotifications();

      if (result.success) {
        setIsEnabled(true);
        setIsSetup(true);
        await checkStatus();
        toast.success('Push notifications enabled successfully!');
      } else {
        toast.error(result.error || 'Failed to enable push notifications');
      }
    } catch (error: any) {
      console.error('Push notification setup error:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      // Get current token
      const token = await pushNotificationService.getFCMToken();
      if (token) {
        await pushNotificationService.unregisterDeviceToken(token);
      }

      setIsEnabled(false);
      setIsSetup(false);
      await checkStatus();
      toast.success('Push notifications disabled');
    } catch (error: any) {
      console.error('Failed to disable push notifications:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await pushNotificationService.sendTestNotification();
      toast.success(
        `Test notification sent! (${result.data.successCount}/${result.data.totalTokens} successful)`
      );
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      const message =
        error.response?.data?.error?.message || 'Failed to send test notification';
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    if (checked) {
      handleSetup();
    } else {
      handleDisable();
    }
  };

  const isFirebaseConfigured = () => {
    return (
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Receive notifications when the app is in the background
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Receive notifications when the app is in the background
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not configured. Please contact your administrator to set up
              Firebase Cloud Messaging.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check if browser supports notifications
  if (!('Notification' in window)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Receive notifications when the app is in the background
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your browser does not support push notifications. Please use a modern browser like
              Chrome, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check if permission is denied
  const isPermissionDenied = Notification.permission === 'denied';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>
          Receive notifications when the app is in the background
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label>Enable Push Notifications</Label>
              {isEnabled && (
                <Badge variant="default" className="text-xs">
                  <Bell className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isEnabled
                ? 'You will receive push notifications on this device'
                : 'Enable to receive notifications when the app is closed or in the background'}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isPermissionDenied || isLoading}
          />
        </div>

        {isPermissionDenied && (
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertDescription>
              Push notification permission was denied. Please enable notifications in your browser
              settings and refresh the page.
            </AlertDescription>
          </Alert>
        )}

        {isEnabled && (
          <>
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Push notifications are enabled for this device. You'll receive notifications even
                when the app is closed.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Test Notification
              </Button>

              {fcmInitialized && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  {registeredTokens} device{registeredTokens !== 1 ? 's' : ''} registered
                </Badge>
              )}
            </div>
          </>
        )}

        {!fcmInitialized && !isPermissionDenied && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Firebase Cloud Messaging is not initialized on the backend. Push notifications may
              not work properly.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
