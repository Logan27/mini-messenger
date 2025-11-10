import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  BellOff,
  Moon,
  MessageSquare,
  Phone,
  Users,
  
  Loader2,
  Info,
  TestTube2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { socketService } from '@/services/socket.service';

interface NotificationPreferences {
  enabled: boolean;
  notificationTypes: {
    messages: boolean;
    calls: boolean;
    groupMessages: boolean;
    mentions: boolean;
    reactions: boolean;
    contactRequests: boolean;
  };
  doNotDisturb: {
    enabled: boolean;
    schedule: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string; // HH:mm format
    };
  };
  desktop: {
    enabled: boolean;
    showPreview: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  notificationTypes: {
    messages: true,
    calls: true,
    groupMessages: true,
    mentions: true,
    reactions: true,
    contactRequests: true,
  },
  doNotDisturb: {
    enabled: false,
    schedule: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
  },
  desktop: {
    enabled: true,
    showPreview: true,
  },
};

export const NotificationSettings = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  // Transform frontend preferences to backend format
  const toBackendFormat = (prefs: NotificationPreferences) => {
    return {
      inAppEnabled: prefs.enabled,
      pushEnabled: prefs.desktop.enabled,
      doNotDisturb: prefs.doNotDisturb.enabled,
      quietHoursStart: prefs.doNotDisturb.schedule.enabled ? prefs.doNotDisturb.schedule.startTime : undefined,
      quietHoursEnd: prefs.doNotDisturb.schedule.enabled ? prefs.doNotDisturb.schedule.endTime : undefined,
      messageNotifications: prefs.notificationTypes.messages,
      callNotifications: prefs.notificationTypes.calls,
      mentionNotifications: prefs.notificationTypes.mentions,
    };
  };

  // Transform backend response to frontend format
  const fromBackendFormat = (backendData: Record<string, unknown>): Partial<NotificationPreferences> => {
    return {
      enabled: backendData.inAppEnabled ?? true,
      notificationTypes: {
        messages: backendData.messageNotifications ?? true,
        calls: backendData.callNotifications ?? true,
        groupMessages: true,
        mentions: backendData.mentionNotifications ?? true,
        reactions: true,
        contactRequests: true,
      },
      doNotDisturb: {
        enabled: backendData.doNotDisturb ?? false,
        schedule: {
          enabled: !!(backendData.quietHoursStart && backendData.quietHoursEnd),
          startTime: backendData.quietHoursStart || '22:00',
          endTime: backendData.quietHoursEnd || '08:00',
        },
      },
      desktop: {
        enabled: backendData.pushEnabled ?? true,
        showPreview: true,
      },
    };
  };

  useEffect(() => {
    loadPreferences();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        toast.success('Notifications enabled successfully');
      } else {
        toast.error('Notification permission denied');
      }
    }
  };

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/notification-settings');
      console.log('🔔 NotificationSettings: API response:', response.data);

      if (response.data?.data?.settings) {
        const backendSettings = response.data.data.settings;
        console.log('🔔 NotificationSettings: Backend settings:', backendSettings);
        console.log('🔔 NotificationSettings: messageNotifications RAW value:', backendSettings.messageNotifications, 'type:', typeof backendSettings.messageNotifications);

        const backendPrefs = fromBackendFormat(backendSettings);
        console.log('🔔 NotificationSettings: Transformed prefs:', backendPrefs);
        console.log('🔔 NotificationSettings: Transformed messages value:', backendPrefs.notificationTypes?.messages, 'type:', typeof backendPrefs.notificationTypes?.messages);

        const finalPrefs = { ...DEFAULT_PREFERENCES, ...backendPrefs };
        console.log('🔔 NotificationSettings: Final prefs after merge:', finalPrefs);
        console.log('🔔 NotificationSettings: Final messages toggle value:', finalPrefs.notificationTypes.messages);

        setPreferences(finalPrefs);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      // Use defaults if API fails
      if (error.response?.status !== 404) {
        toast.error('Failed to load notification settings');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (path: string, value: unknown) => {
    console.log(`🔧 NotificationSettings: Updating ${path} to:`, value, 'type:', typeof value);

    // Update local state
    const newPrefs = JSON.parse(JSON.stringify(preferences));
    const keys = path.split('.');

    let current: Record<string, unknown> = newPrefs;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    console.log('🔧 NotificationSettings: New preferences after update:', newPrefs);
    setPreferences(newPrefs);

    // Save immediately to backend
    try {
      const backendData = toBackendFormat(newPrefs);
      console.log('🔧 NotificationSettings: Sending to backend:', backendData);

      await apiClient.put('/notification-settings', backendData);
      console.log('✅ NotificationSettings: Settings saved successfully');
      toast.success('Setting updated');

      // Manually trigger event for useGlobalNotifications hook
      // (Backend WebSocket event might not be reliable)
      console.log('🔄 NotificationSettings: Manually triggering settings update event');
      socketService.triggerLocalEvent('notification-settings:updated', {
        settings: backendData,
        updatedBy: 'self'
      });
    } catch (error) {
      console.error('❌ NotificationSettings: Failed to save:', error);
      toast.error('Failed to save setting');
      // Revert on error
      setPreferences(preferences);
    }
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is how notifications will appear on your device',
        icon: '/logo.png',
        badge: '/logo.png',
      });
      toast.success('Test notification sent');
    } else {
      toast.error('Please enable notifications first');
    }
  };

  const isInDoNotDisturbPeriod = () => {
    if (!preferences.doNotDisturb.enabled || !preferences.doNotDisturb.schedule.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const { startTime, endTime } = preferences.doNotDisturb.schedule;

    // Handle overnight periods (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isDndActive = isInDoNotDisturbPeriod();

  return (
    <div className="space-y-4">
      {/* Main Notification Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {preferences.enabled ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
                Notifications
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(checked) => updatePreference('enabled', checked)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Permission Status */}
          {permissionStatus !== 'granted' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Browser notifications are {permissionStatus === 'denied' ? 'blocked' : 'not enabled'}
                </span>
                {permissionStatus === 'default' && (
                  <Button size="sm" onClick={requestNotificationPermission}>
                    Enable
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Test Notification */}
          <Button
            variant="outline"
            className="w-full"
            onClick={testNotification}
            disabled={!preferences.enabled || permissionStatus !== 'granted'}
          >
            <TestTube2 className="mr-2 h-4 w-4" />
            Send Test Notification
          </Button>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Direct Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for new messages
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.notificationTypes.messages}
              onCheckedChange={(checked) =>
                updatePreference('notificationTypes.messages', checked)
              }
              disabled={!preferences.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Calls</Label>
                <p className="text-sm text-muted-foreground">
                  Incoming voice and video calls
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.notificationTypes.calls}
              onCheckedChange={(checked) =>
                updatePreference('notificationTypes.calls', checked)
              }
              disabled={!preferences.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Group Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Messages in group chats
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.notificationTypes.groupMessages}
              onCheckedChange={(checked) =>
                updatePreference('notificationTypes.groupMessages', checked)
              }
              disabled={!preferences.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 flex items-center justify-center text-muted-foreground">
                👍
              </div>
              <div>
                <Label>Reactions</Label>
                <p className="text-sm text-muted-foreground">
                  Reactions to your messages
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.notificationTypes.reactions}
              onCheckedChange={(checked) =>
                updatePreference('notificationTypes.reactions', checked)
              }
              disabled={!preferences.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 flex items-center justify-center text-muted-foreground">
                👤
              </div>
              <div>
                <Label>Contact Requests</Label>
                <p className="text-sm text-muted-foreground">
                  New contact requests
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.notificationTypes.contactRequests}
              onCheckedChange={(checked) =>
                updatePreference('notificationTypes.contactRequests', checked)
              }
              disabled={!preferences.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Do Not Disturb
                {isDndActive && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Silence notifications during specific times
              </CardDescription>
            </div>
            <Switch
              checked={preferences.doNotDisturb.enabled}
              onCheckedChange={(checked) =>
                updatePreference('doNotDisturb.enabled', checked)
              }
              disabled={!preferences.enabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences.doNotDisturb.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Scheduled Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically enable during specific times
                  </p>
                </div>
                <Switch
                  checked={preferences.doNotDisturb.schedule.enabled}
                  onCheckedChange={(checked) =>
                    updatePreference('doNotDisturb.schedule.enabled', checked)
                  }
                />
              </div>

              {preferences.doNotDisturb.schedule.enabled && (
                <>
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <input
                        id="start-time"
                        type="time"
                        value={preferences.doNotDisturb.schedule.startTime}
                        onChange={(e) =>
                          updatePreference('doNotDisturb.schedule.startTime', e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <input
                        id="end-time"
                        type="time"
                        value={preferences.doNotDisturb.schedule.endTime}
                        onChange={(e) =>
                          updatePreference('doNotDisturb.schedule.endTime', e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {preferences.doNotDisturb.schedule.startTime >
                      preferences.doNotDisturb.schedule.endTime
                        ? `Quiet hours: ${preferences.doNotDisturb.schedule.startTime} to ${preferences.doNotDisturb.schedule.endTime} (overnight)`
                        : `Quiet hours: ${preferences.doNotDisturb.schedule.startTime} to ${preferences.doNotDisturb.schedule.endTime}`}
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>


      {/* Desktop Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Desktop Notifications</CardTitle>
              <CardDescription>Configure desktop notification behavior</CardDescription>
            </div>
            <Switch
              checked={preferences.desktop.enabled}
              onCheckedChange={(checked) => updatePreference('desktop.enabled', checked)}
              disabled={!preferences.enabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences.desktop.enabled && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Message Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Display message content in notifications
                </p>
              </div>
              <Switch
                checked={preferences.desktop.showPreview}
                onCheckedChange={(checked) =>
                  updatePreference('desktop.showPreview', checked)
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
