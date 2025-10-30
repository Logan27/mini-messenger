import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  Trash2,
  RefreshCw,
  ExternalLink,
  Clock,
  Wifi,
  Smartphone,
  Globe,
  FileText,
  MessageSquare,
  Users
} from 'lucide-react'
import { useUser } from '../model/useAdmin'
import { useAdminActions } from '../model/useAdmin'
import { AdminUser } from '@/shared/lib/types'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

interface UserDetailsModalProps {
  userId: string | null
  isOpen: boolean
  onClose: () => void
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ userId, isOpen, onClose }) => {
  const { data: user, isLoading } = useUser(userId || '')
  const { suspendUser, deleteUser } = useAdminActions()
  const [activeTab, setActiveTab] = useState('overview')

  if (!userId) return null

  const handleSuspendUser = (duration: number, reason: string) => {
    if (!user) return
    suspendUser({ userId: user.id, duration, reason })
    toast.success(`User suspended for ${duration} hours`)
  }

  const handleDeleteUser = (reason: string) => {
    if (!user) return
    deleteUser({ userId: user.id, reason })
    toast.success('User deleted successfully')
    onClose()
  }

  const getStatusBadge = (user: AdminUser) => {
    if (!user.isApproved) return <Badge variant="secondary">Pending Approval</Badge>
    if (user.isOnline) return <Badge variant="default">Online</Badge>
    return <Badge variant="outline">Offline</Badge>
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin'
      ? <Badge variant="destructive">Administrator</Badge>
      : <Badge variant="outline">Regular User</Badge>
  }

  const getViolationSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>
      case 'high': return <Badge variant="secondary">High</Badge>
      case 'medium': return <Badge variant="outline">Medium</Badge>
      case 'low': return <Badge variant="outline">Low</Badge>
      default: return <Badge variant="outline">{severity}</Badge>
    }
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="text-center py-8">
            <p className="text-muted-foreground">User not found</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {user.name}
                {getStatusBadge(user)}
                {getRoleBadge(user.role)}
              </div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detailed user information and account management
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Joined {format(new Date(user.createdAt), 'PPP')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Last login: {user.lastLoginAt
                        ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                        : 'Never'
                      }
                    </span>
                  </div>
                  {user.lastLoginIP && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Last IP: {user.lastLoginIP}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Account Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Account Status</span>
                    {user.isApproved ? (
                      <Badge variant="default">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Online Status</span>
                    {user.isOnline ? (
                      <Badge variant="default">Online</Badge>
                    ) : (
                      <Badge variant="outline">Offline</Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Activity Score</span>
                    <Badge variant={user.activityScore > 50 ? 'default' : 'secondary'}>
                      {user.activityScore}/100
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Login Count</span>
                    <span className="text-sm font-mono">{user.loginCount}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Device Information */}
              {user.deviceInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Device Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user.deviceInfo.browser && (
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.deviceInfo.browser}</span>
                      </div>
                    )}
                    {user.deviceInfo.os && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.deviceInfo.os}</span>
                      </div>
                    )}
                    {user.deviceInfo.device && (
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.deviceInfo.device}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Registration Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Registration Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Registration IP: {user.registrationIP || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Registered: {format(new Date(user.createdAt), 'PPpp')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>User activity and engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">1,234</div>
                    <div className="text-sm text-muted-foreground">Messages Sent</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold">56</div>
                    <div className="text-sm text-muted-foreground">Groups Joined</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">89</div>
                    <div className="text-sm text-muted-foreground">Files Shared</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <div className="text-2xl font-bold">{user.loginCount}</div>
                    <div className="text-sm text-muted-foreground">Total Logins</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Violation History</CardTitle>
                <CardDescription>User violations and moderation actions</CardDescription>
              </CardHeader>
              <CardContent>
                {user.violations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p>No violations recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.violations.map((violation) => (
                      <div key={violation.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="font-medium">{violation.type.replace('_', ' ')}</span>
                            {getViolationSeverityBadge(violation.severity)}
                          </div>
                          <Badge variant="outline">
                            {violation.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                        <div className="text-xs text-muted-foreground">
                          Reported {formatDistanceToNow(new Date(violation.reportedAt), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Administrative Actions</CardTitle>
                <CardDescription>Available actions for this user account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => toast.info('Feature not implemented yet')}
                  >
                    <Mail className="h-4 w-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Send Warning Email</div>
                      <div className="text-sm text-muted-foreground">Send a warning message to the user</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => handleSuspendUser(24, 'Administrative suspension')}
                  >
                    <Ban className="h-4 w-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Suspend Account</div>
                      <div className="text-sm text-muted-foreground">Temporarily suspend user access</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => toast.info('Feature not implemented yet')}
                  >
                    <RefreshCw className="h-4 w-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Reset Password</div>
                      <div className="text-sm text-muted-foreground">Force password reset on next login</div>
                    </div>
                  </Button>

                  <Button
                    variant="destructive"
                    className="justify-start h-auto p-4"
                    onClick={() => handleDeleteUser('Administrative deletion')}
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Delete Account</div>
                      <div className="text-sm text-muted-foreground">Permanently delete user account</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default UserDetailsModal