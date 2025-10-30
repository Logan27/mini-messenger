import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import {
  Settings,
  Save,
  RotateCcw,
  Shield,
  Users,
  HardDrive,
  Mail,
  Bell,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/adminApi'
import { toast } from 'sonner'

interface SystemSettings {
  // User Settings
  maxUsers: number
  requireAdminApproval: boolean
  allowUserRegistration: boolean
  defaultUserRole: 'user' | 'admin'
  
  // File Upload Settings
  maxFileSize: number
  allowedFileTypes: string[]
  storageQuotaPerUser: number
  
  // Security Settings
  sessionTimeout: number
  maxLoginAttempts: number
  passwordMinLength: number
  enableTwoFactorAuth: boolean
  
  // Email Settings
  emailNotificationsEnabled: boolean
  emailFromAddress: string
  emailFromName: string
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPassword?: string
  
  // System Settings
  maintenanceMode: boolean
  maintenanceMessage?: string
  enableDebugMode: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  
  // Notification Settings
  enablePushNotifications: boolean
  enableEmailNotifications: boolean
  notificationRetentionDays: number
}

const defaultSettings: SystemSettings = {
  maxUsers: 100,
  requireAdminApproval: true,
  allowUserRegistration: true,
  defaultUserRole: 'user',
  maxFileSize: 10485760, // 10MB
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'],
  storageQuotaPerUser: 1073741824, // 1GB
  sessionTimeout: 3600, // 1 hour
  maxLoginAttempts: 5,
  passwordMinLength: 8,
  enableTwoFactorAuth: false,
  emailNotificationsEnabled: true,
  emailFromAddress: 'noreply@messenger.com',
  emailFromName: 'Messenger',
  maintenanceMode: false,
  enableDebugMode: false,
  logLevel: 'info',
  enablePushNotifications: true,
  enableEmailNotifications: true,
  notificationRetentionDays: 30,
}

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['admin', 'system-settings'],
    queryFn: adminApi.getSystemSettings,
    onSuccess: (data) => {
      setSettings({ ...defaultSettings, ...data })
      setHasChanges(false)
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: adminApi.updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-settings'] })
      toast.success('System settings updated successfully')
      setHasChanges(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update system settings')
    },
  })

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateSettingsMutation.mutate(settings)
  }

  const handleReset = () => {
    if (currentSettings) {
      setSettings({ ...defaultSettings, ...currentSettings })
      setHasChanges(false)
    }
    setResetDialogOpen(false)
  }

  const handleResetToDefaults = () => {
    setSettings(defaultSettings)
    setHasChanges(true)
    setResetDialogOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetDialogOpen(true)}
                disabled={!hasChanges}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || updateSettingsMutation.isLoading}
              >
                {updateSettingsMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* User Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Maximum Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="1"
                  value={settings.maxUsers}
                  onChange={(e) => handleSettingChange('maxUsers', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of users allowed on the platform
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultUserRole">Default User Role</Label>
                <Select
                  value={settings.defaultUserRole}
                  onValueChange={(value) => handleSettingChange('defaultUserRole', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Default role assigned to new users
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Admin Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New users require admin approval before accessing
                  </p>
                </div>
                <Switch
                  checked={settings.requireAdminApproval}
                  onCheckedChange={(checked) => handleSettingChange('requireAdminApproval', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow User Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to register on the platform
                  </p>
                </div>
                <Switch
                  checked={settings.allowUserRegistration}
                  onCheckedChange={(checked) => handleSettingChange('allowUserRegistration', checked)}
                />
              </div>
            </div>
          </div>

          {/* File Upload Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              File Upload Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxFileSize">Maximum File Size (bytes)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min="1"
                  value={settings.maxFileSize}
                  onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum file size for uploads (default: 10MB)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storageQuotaPerUser">Storage Quota Per User (bytes)</Label>
                <Input
                  id="storageQuotaPerUser"
                  type="number"
                  min="1"
                  value={settings.storageQuotaPerUser}
                  onChange={(e) => handleSettingChange('storageQuotaPerUser', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Storage limit per user (default: 1GB)
                </p>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                <Input
                  id="allowedFileTypes"
                  value={settings.allowedFileTypes.join(', ')}
                  onChange={(e) => handleSettingChange('allowedFileTypes', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="jpg, png, pdf, doc, etc."
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list of allowed file extensions
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="60"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  User session duration in seconds
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min="1"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum failed login attempts before lockout
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                <Input
                  id="passwordMinLength"
                  type="number"
                  min="6"
                  value={settings.passwordMinLength}
                  onChange={(e) => handleSettingChange('passwordMinLength', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum required password length
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all users
                  </p>
                </div>
                <Switch
                  checked={settings.enableTwoFactorAuth}
                  onCheckedChange={(checked) => handleSettingChange('enableTwoFactorAuth', checked)}
                />
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications to users
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotificationsEnabled}
                  onCheckedChange={(checked) => handleSettingChange('emailNotificationsEnabled', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emailFromAddress">From Email Address</Label>
                <Input
                  id="emailFromAddress"
                  type="email"
                  value={settings.emailFromAddress}
                  onChange={(e) => handleSettingChange('emailFromAddress', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emailFromName">From Name</Label>
                <Input
                  id="emailFromName"
                  value={settings.emailFromName}
                  onChange={(e) => handleSettingChange('emailFromName', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={settings.smtpHost || ''}
                  onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={settings.smtpPort || ''}
                  onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value) || undefined)}
                  placeholder="587"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input
                  id="smtpUser"
                  value={settings.smtpUser || ''}
                  onChange={(e) => handleSettingChange('smtpUser', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Put the system in maintenance mode
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable debug logging and features
                  </p>
                </div>
                <Switch
                  checked={settings.enableDebugMode}
                  onCheckedChange={(checked) => handleSettingChange('enableDebugMode', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logLevel">Log Level</Label>
                <Select
                  value={settings.logLevel}
                  onValueChange={(value) => handleSettingChange('logLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={settings.maintenanceMessage || ''}
                  onChange={(e) => handleSettingChange('maintenanceMessage', e.target.value)}
                  placeholder="Message shown to users during maintenance"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send push notifications to users
                  </p>
                </div>
                <Switch
                  checked={settings.enablePushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('enablePushNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications to users
                  </p>
                </div>
                <Switch
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('enableEmailNotifications', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notificationRetentionDays">Notification Retention (days)</Label>
                <Input
                  id="notificationRetentionDays"
                  type="number"
                  min="1"
                  value={settings.notificationRetentionDays}
                  onChange={(e) => handleSettingChange('notificationRetentionDays', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Days to keep notification history
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to reset to the last saved settings or restore defaults?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Reset to Last Saved
            </AlertDialogAction>
            <AlertDialogAction variant="destructive" onClick={handleResetToDefaults}>
              Restore Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          You have unsaved changes
        </div>
      )}
    </div>
  )
}

export default SystemSettings