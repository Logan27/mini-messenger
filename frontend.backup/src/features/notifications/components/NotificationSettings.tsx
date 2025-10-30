import React, { useState } from 'react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Bell, BellOff, Eye, Mail, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className }) => {
  const { settings, loading, error, updateSettings, resetSettings, previewSettings } = useNotificationSettings();
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'channels' | 'types' | 'preview'>('general');

  const handleSettingChange = async (key: string, value: boolean | string) => {
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleResetSettings = async () => {
    try {
      await resetSettings();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handlePreview = async (notificationType: string, channel: string = 'inApp') => {
    try {
      setPreviewLoading(true);
      const result = await previewSettings(notificationType, channel);
      setPreviewResult(result);
      setActiveTab('preview');
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'Not set';
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isInQuietHours = () => {
    if (!settings?.quietHoursStart || !settings?.quietHoursEnd) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = timeToMinutes(settings.quietHoursStart);
    const endTime = timeToMinutes(settings.quietHoursEnd);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Manage how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleResetSettings}>
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {isInQuietHours() ? (
                <BellOff className="h-4 w-4 text-orange-500" />
              ) : settings.doNotDisturb ? (
                <BellOff className="h-4 w-4 text-red-500" />
              ) : (
                <Bell className="h-4 w-4 text-green-500" />
              )}
              <div className="text-sm font-medium">
                {isInQuietHours() ? 'Quiet Hours Active' : settings.doNotDisturb ? 'Do Not Disturb' : 'Receiving Notifications'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div className="text-sm">
                {settings.quietHoursStart && settings.quietHoursEnd ? (
                  <span>
                    {formatTime(settings.quietHoursStart)} - {formatTime(settings.quietHoursEnd)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No quiet hours set</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <div className="text-sm font-medium">
                {settings.inAppEnabled && settings.emailEnabled && settings.pushEnabled
                  ? 'All channels enabled'
                  : `${[settings.inAppEnabled, settings.emailEnabled, settings.pushEnabled].filter(Boolean).length} channels active`
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation Tabs */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { id: 'general', label: 'General', icon: Bell },
              { id: 'channels', label: 'Channels', icon: Smartphone },
              { id: 'types', label: 'Notification Types', icon: Mail },
              { id: 'preview', label: 'Preview', icon: Eye },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab(tab.id as any)}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Settings Content */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Do Not Disturb</label>
                        <p className="text-sm text-muted-foreground">
                          Block all notifications when enabled
                        </p>
                      </div>
                      <Switch
                        checked={settings.doNotDisturb}
                        onCheckedChange={(checked) => handleSettingChange('doNotDisturb', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Quiet Hours</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">Start Time</label>
                          <input
                            type="time"
                            className="w-full mt-1 px-3 py-2 border rounded-md"
                            value={settings.quietHoursStart || ''}
                            onChange={(e) => handleSettingChange('quietHoursStart', e.target.value || null)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">End Time</label>
                          <input
                            type="time"
                            className="w-full mt-1 px-3 py-2 border rounded-md"
                            value={settings.quietHoursEnd || ''}
                            onChange={(e) => handleSettingChange('quietHoursEnd', e.target.value || null)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Notifications will be paused during these hours
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Channel Settings */}
            {activeTab === 'channels' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
                <div className="space-y-4">
                  {[
                    { key: 'inAppEnabled', label: 'In-App Notifications', icon: Bell, description: 'Notifications within the app' },
                    { key: 'emailEnabled', label: 'Email Notifications', icon: Mail, description: 'Email notifications to your registered email' },
                    { key: 'pushEnabled', label: 'Push Notifications', icon: Smartphone, description: 'Browser push notifications' },
                  ].map((channel) => (
                    <div key={channel.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <channel.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium">{channel.label}</label>
                          <p className="text-sm text-muted-foreground">{channel.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings[channel.key as keyof typeof settings] as boolean}
                        onCheckedChange={(checked) => handleSettingChange(channel.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notification Types */}
            {activeTab === 'types' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
                <div className="space-y-4">
                  {[
                    { key: 'messageNotifications', label: 'Message Notifications', description: 'New messages and replies' },
                    { key: 'callNotifications', label: 'Call Notifications', description: 'Incoming calls and missed calls' },
                    { key: 'mentionNotifications', label: 'Mention Notifications', description: 'When someone mentions you' },
                    { key: 'adminNotifications', label: 'Admin Notifications', description: 'Administrative messages and updates' },
                    { key: 'systemNotifications', label: 'System Notifications', description: 'System updates and maintenance' },
                  ].map((type) => (
                    <div key={type.key} className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">{type.label}</label>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={settings[type.key as keyof typeof settings] as boolean}
                          onCheckedChange={(checked) => handleSettingChange(type.key, checked)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(type.key.replace('Notifications', ''), 'inApp')}
                          disabled={previewLoading}
                        >
                          Preview
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {activeTab === 'preview' && previewResult && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Preview Results</h3>

                {/* Current Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {previewResult.currentSettings.wouldReceive ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      )}
                      Current Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Would Receive:</span>
                        <Badge variant={previewResult.currentSettings.wouldReceive ? 'default' : 'secondary'} className="ml-2">
                          {previewResult.currentSettings.wouldReceive ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">In Quiet Hours:</span>
                        <Badge variant={previewResult.currentSettings.isInQuietHours ? 'destructive' : 'secondary'} className="ml-2">
                          {previewResult.currentSettings.isInQuietHours ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    {previewResult.currentSettings.reason !== 'Would be received' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Reason:</strong> {previewResult.currentSettings.reason}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Scenario Previews */}
                <div className="space-y-3">
                  <h4 className="font-medium">Scenario Previews</h4>
                  {previewResult.preview.map((scenario: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{scenario.scenario}</div>
                            <div className="text-xs text-muted-foreground">
                              {scenario.time !== 'Not set' && `Time: ${scenario.time}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={scenario.wouldReceive ? 'default' : 'secondary'}>
                              {scenario.wouldReceive ? 'Would Receive' : 'Blocked'}
                            </Badge>
                            {scenario.inQuietHours && (
                              <Badge variant="outline">Quiet Hours</Badge>
                            )}
                            {scenario.doNotDisturb && (
                              <Badge variant="destructive">DND</Badge>
                            )}
                          </div>
                        </div>
                        {scenario.reason !== 'Would be received' && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {scenario.reason}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};