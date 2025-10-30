import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/dialog'
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Ban,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserX,
  RefreshCw,
  Users
} from 'lucide-react'
import { useUsers } from '../model/useAdmin'
import { useAdminActions } from '../model/useAdmin'
import { AdminUser, AdminFilters } from '@/shared/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface UserManagementProps {
  onViewUser?: (user: AdminUser) => void
}

const UserManagement: React.FC<UserManagementProps> = ({ onViewUser }) => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AdminFilters>({
    status: 'all',
    role: 'all',
    search: ''
  })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    type: 'suspend' | 'delete' | 'bulk'
    user?: AdminUser
    users?: AdminUser[]
  }>({ isOpen: false, type: 'suspend' })

  const { data: usersData, isLoading } = useUsers(filters, page, 20)
  const { suspendUser, deleteUser, bulkAction } = useAdminActions()

  const users = usersData?.data || []
  const totalPages = usersData?.pagination.totalPages || 1

  const getStatusBadge = (user: AdminUser) => {
    if (!user.isApproved) return <Badge variant="secondary">Pending</Badge>
    if (user.isOnline) return <Badge variant="default">Online</Badge>
    return <Badge variant="outline">Offline</Badge>
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin'
      ? <Badge variant="destructive">Admin</Badge>
      : <Badge variant="outline">User</Badge>
  }

  const handleSuspendUser = (user: AdminUser) => {
    setActionDialog({ isOpen: true, type: 'suspend', user })
  }

  const handleDeleteUser = (user: AdminUser) => {
    setActionDialog({ isOpen: true, type: 'delete', user })
  }

  const handleBulkAction = (action: 'suspend' | 'delete') => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    const selectedUserObjects = users.filter(user => selectedUsers.includes(user.id))
    setActionDialog({ isOpen: true, type: 'bulk', users: selectedUserObjects })
  }

  const confirmSuspend = (duration: number, reason: string) => {
    if (actionDialog.type === 'suspend' && actionDialog.user) {
      suspendUser({ userId: actionDialog.user.id, duration, reason })
    } else if (actionDialog.type === 'bulk' && actionDialog.users) {
      bulkAction({
        type: 'suspend',
        targetIds: actionDialog.users.map(u => u.id),
        duration,
        reason
      })
    }
    setActionDialog({ isOpen: false, type: 'suspend' })
  }

  const confirmDelete = (reason: string) => {
    if (actionDialog.type === 'delete' && actionDialog.user) {
      deleteUser({ userId: actionDialog.user.id, reason })
    } else if (actionDialog.type === 'bulk' && actionDialog.users) {
      bulkAction({
        type: 'delete',
        targetIds: actionDialog.users.map(u => u.id),
        reason
      })
    }
    setActionDialog({ isOpen: false, type: 'suspend' })
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    setSelectedUsers(
      selectedUsers.length === users.length
        ? []
        : users.map(user => user.id)
    )
  }

  const updateFilter = (key: keyof AdminFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filtering
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage active users, permissions, and account actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or username..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.role || 'all'} onValueChange={(value) => updateFilter('role', value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('suspend')}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend Selected
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={selectAllUsers}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                              ) : (
                                <span className="text-sm font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            {user.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Activity Score: {user.activityScore}</div>
                          <div className="text-muted-foreground">
                            {user.loginCount} logins
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.lastLoginAt
                            ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                            : 'Never'
                          }
                        </div>
                        {user.lastLoginIP && (
                          <div className="text-xs text-muted-foreground">
                            IP: {user.lastLoginIP}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewUser?.(user)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleSuspendUser(user)}
                              className="text-orange-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialogs */}
      <AlertDialog open={actionDialog.isOpen} onOpenChange={(open) =>
        !open && setActionDialog({ isOpen: false, type: 'suspend' })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'suspend' && 'Suspend User'}
              {actionDialog.type === 'delete' && 'Delete User'}
              {actionDialog.type === 'bulk' && `Bulk ${actionDialog.users?.[0] ? 'Suspend' : 'Delete'} Users`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'suspend' && (
                <>This will temporarily suspend {actionDialog.user?.name}'s account. They will not be able to log in or use the platform.</>
              )}
              {actionDialog.type === 'delete' && (
                <>This will permanently delete {actionDialog.user?.name}'s account and all associated data. This action cannot be undone.</>
              )}
              {actionDialog.type === 'bulk' && (
                <>This action will be applied to {selectedUsers.length} selected users. This cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionDialog.type === 'delete' ? confirmDelete('Bulk deletion') : confirmSuspend(24, 'Bulk suspension')}
              className={actionDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {actionDialog.type === 'suspend' && 'Suspend'}
              {actionDialog.type === 'delete' && 'Delete'}
              {actionDialog.type === 'bulk' && 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default UserManagement