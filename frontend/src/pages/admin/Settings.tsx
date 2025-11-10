import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  HardDrive,
  Clock,
  Shield,
  Zap,
  ToggleLeft,
  Save,
  Loader2,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface SystemSettings {
  general: {
    appName: string;
    maxUsers: number;
    allowRegistration: boolean;
    requireApproval: boolean;
  };
  storage: {
    maxFileSize: number; // MB
    maxUploadSize: number; // MB
    allowedFileTypes: string[];
    messageRetentionDays: number;
  };
  security: {
    sessionTimeout: number; // minutes
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    require2FA: boolean;
    passwordMinLength: number;
  };
  rateLimiting: {
    enabled: boolean;
    loginAttemptsPerMinute: number;
    apiRequestsPerMinute: number;
    messagesSendPerMinute: number;
    fileUploadsPerHour: number;
  };
  features: {
    voiceCalls: boolean;
    videoCalls: boolean;
    groupChats: boolean;
    fileSharing: boolean;
    messageReactions: boolean;
    messageEditing: boolean;
    messageForwarding: boolean;
  };
}

const DEFAULT_SETTINGS: SystemSettings = {
  general: {
    appName: 'Messenger',
    maxUsers: 100,
    allowRegistration: true,
    requireApproval: true,
  },
  storage: {
    maxFileSize: 10,
    maxUploadSize: 50,
    allowedFileTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
    messageRetentionDays: 30,
  },
  security: {
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    require2FA: false,
    passwordMinLength: 8,
  },
  rateLimiting: {
    enabled: true,
    loginAttemptsPerMinute: 5,
    apiRequestsPerMinute: 100,
    messagesSendPerMinute: 20,
    fileUploadsPerHour: 10,
  },
  features: {
    voiceCalls: false,
    videoCalls: false,
    groupChats: true,
    fileSharing: true,
    messageReactions: true,
    messageEditing: true,
    messageForwarding: true,
  },
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const response = await axios.get(`${apiUrl}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...response.data });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load system settings';
      setError(errorMsg);
      console.error('Failed to load system settings:', err);
      
      // Use defaults if API fails
      if (err.response?.status !== 404) {
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.put(
        `${apiUrl}/admin/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setHasChanges(false);
      toast.success('System settings saved successfully');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save system settings';
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (section: keyof SystemSettings, key: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values? This cannot be undone.')) {
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(true);
      toast.info('Settings reset to defaults. Click Save to apply.');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">
              Configure system-wide settings and features
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            {hasChanges && (
              <Button onClick={saveSettings} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic system configuration and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input
                id="appName"
                value={settings.general.appName}
                onChange={(e) => updateSetting('general', 'appName', e.target.value)}
                placeholder="Messenger"
              />
              <p className="text-xs text-muted-foreground">
                Displayed in the app header and emails
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="maxUsers">Maximum Users</Label>
              <Input
                id="maxUsers"
                type="number"
                min="1"
                max="1000"
                value={settings.general.maxUsers}
                onChange={(e) => updateSetting('general', 'maxUsers', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Hard limit: 100 users per system requirement
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow User Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to sign up
                </p>
              </div>
              <Switch
                checked={settings.general.allowRegistration}
                onCheckedChange={(checked) =>
                  updateSetting('general', 'allowRegistration', checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Admin Approval</Label>
                <p className="text-sm text-muted-foreground">
                  New registrations need admin approval
                </p>
              </div>
              <Switch
                checked={settings.general.requireApproval}
                onCheckedChange={(checked) =>
                  updateSetting('general', 'requireApproval', checked)
                }
                disabled={!settings.general.allowRegistration}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage & File Settings
            </CardTitle>
            <CardDescription>
              File upload limits and retention policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                min="1"
                max="100"
                value={settings.storage.maxFileSize}
                onChange={(e) => updateSetting('storage', 'maxFileSize', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum size for individual file uploads
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="maxUploadSize">Maximum Total Upload Size (MB)</Label>
              <Input
                id="maxUploadSize"
                type="number"
                min="10"
                max="500"
                value={settings.storage.maxUploadSize}
                onChange={(e) => updateSetting('storage', 'maxUploadSize', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum size for batch uploads in a single request
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="messageRetention">Message Retention (Days)</Label>
              <Select
                value={settings.storage.messageRetentionDays.toString()}
                onValueChange={(value) =>
                  updateSetting('storage', 'messageRetentionDays', parseInt(value))
                }
              >
                <SelectTrigger id="messageRetention">
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Messages older than {settings.storage.messageRetentionDays} days will be
                  automatically deleted. Current setting: 30 days per system requirement.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Authentication and session management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="15"
                max="1440"
                value={settings.security.sessionTimeout}
                onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Idle time before automatic logout (15-1440 minutes)
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Maximum Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min="3"
                max="10"
                value={settings.security.maxLoginAttempts}
                onChange={(e) =>
                  updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Failed attempts before account lockout
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <Input
                id="lockoutDuration"
                type="number"
                min="5"
                max="120"
                value={settings.security.lockoutDuration}
                onChange={(e) =>
                  updateSetting('security', 'lockoutDuration', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                How long accounts are locked after max failed attempts
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                min="8"
                max="32"
                value={settings.security.passwordMinLength}
                onChange={(e) =>
                  updateSetting('security', 'passwordMinLength', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum characters required for passwords (8-32)
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Force all users to enable 2FA
                </p>
              </div>
              <Switch
                checked={settings.security.require2FA}
                onCheckedChange={(checked) => updateSetting('security', 'require2FA', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Rate Limiting
                </CardTitle>
                <CardDescription>
                  Prevent abuse and control API usage
                </CardDescription>
              </div>
              <Switch
                checked={settings.rateLimiting.enabled}
                onCheckedChange={(checked) => updateSetting('rateLimiting', 'enabled', checked)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.rateLimiting.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="loginRate">Login Attempts per Minute</Label>
                  <Input
                    id="loginRate"
                    type="number"
                    min="1"
                    max="20"
                    value={settings.rateLimiting.loginAttemptsPerMinute}
                    onChange={(e) =>
                      updateSetting('rateLimiting', 'loginAttemptsPerMinute', parseInt(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Per IP address (system requirement: 5/min)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="apiRate">API Requests per Minute</Label>
                  <Input
                    id="apiRate"
                    type="number"
                    min="10"
                    max="500"
                    value={settings.rateLimiting.apiRequestsPerMinute}
                    onChange={(e) =>
                      updateSetting('rateLimiting', 'apiRequestsPerMinute', parseInt(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Per authenticated user (system requirement: 100/min)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="messageRate">Messages Sent per Minute</Label>
                  <Input
                    id="messageRate"
                    type="number"
                    min="5"
                    max="100"
                    value={settings.rateLimiting.messagesSendPerMinute}
                    onChange={(e) =>
                      updateSetting('rateLimiting', 'messagesSendPerMinute', parseInt(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Per user to prevent spam
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="uploadRate">File Uploads per Hour</Label>
                  <Input
                    id="uploadRate"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.rateLimiting.fileUploadsPerHour}
                    onChange={(e) =>
                      updateSetting('rateLimiting', 'fileUploadsPerHour', parseInt(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Per user (system requirement: 10/hour)
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Enable or disable features globally
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Voice Calls</Label>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <Switch
                checked={settings.features.voiceCalls}
                onCheckedChange={(checked) => updateSetting('features', 'voiceCalls', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Video Calls</Label>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <Switch
                checked={settings.features.videoCalls}
                onCheckedChange={(checked) => updateSetting('features', 'videoCalls', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Group Chats</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to create and join groups
                </p>
              </div>
              <Switch
                checked={settings.features.groupChats}
                onCheckedChange={(checked) => updateSetting('features', 'groupChats', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>File Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Allow file uploads and attachments
                </p>
              </div>
              <Switch
                checked={settings.features.fileSharing}
                onCheckedChange={(checked) => updateSetting('features', 'fileSharing', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Message Reactions</Label>
                <p className="text-sm text-muted-foreground">
                  Allow emoji reactions to messages
                </p>
              </div>
              <Switch
                checked={settings.features.messageReactions}
                onCheckedChange={(checked) => updateSetting('features', 'messageReactions', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Message Editing</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to edit sent messages
                </p>
              </div>
              <Switch
                checked={settings.features.messageEditing}
                onCheckedChange={(checked) => updateSetting('features', 'messageEditing', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Message Forwarding</Label>
                <p className="text-sm text-muted-foreground">
                  Allow forwarding messages to other chats
                </p>
              </div>
              <Switch
                checked={settings.features.messageForwarding}
                onCheckedChange={(checked) =>
                  updateSetting('features', 'messageForwarding', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button (Sticky) */}
        {hasChanges && (
          <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t pt-4">
            <Button onClick={saveSettings} disabled={isSaving} className="w-full" size="lg">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
