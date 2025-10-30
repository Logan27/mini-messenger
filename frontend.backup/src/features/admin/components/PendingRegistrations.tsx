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
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Search,
  Filter,
  UserCheck,
  UserX,
  Eye,
  AlertTriangle,
  Clock,
  Shield
} from 'lucide-react'
import { usePendingUsers } from '../model/useAdmin'
import { useAdminActions } from '../model/useAdmin'
import { PendingUser } from '@/shared/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface PendingRegistrationsProps {
  onViewUser?: (user: PendingUser) => void
}

const PendingRegistrations: React.FC<PendingRegistrationsProps> = ({ onViewUser }) => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    type: 'approve' | 'reject' | 'bulk'
    user?: PendingUser
    users?: PendingUser[]
  }>({ isOpen: false, type: 'approve' })

  const { data: pendingUsersData, isLoading } = usePendingUsers(page, 20)
  const { approveUser, rejectUser, bulkAction } = useAdminActions()

  const pendingUsers = pendingUsersData?.data || []
  const totalPages = pendingUsersData?.pagination.totalPages || 1

  const filteredUsers = pendingUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase()) ||
                         user.username.toLowerCase().includes(search.toLowerCase())

    const matchesRisk = riskFilter === 'all' || user.riskScore.toString() === riskFilter

    return matchesSearch && matchesRisk
  })

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 8) return <Badge variant="destructive">High Risk</Badge>
    if (riskScore >= 5) return <Badge variant="secondary">Medium Risk</Badge>
    return <Badge variant="outline">Low Risk</Badge>
  }

  const handleApproveUser = (user: PendingUser) => {
    setActionDialog({ isOpen: true, type: 'approve', user })
  }

  const handleRejectUser = (user: PendingUser) => {
    setActionDialog({ isOpen: true, type: 'reject', user })
  }

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    const selectedUserObjects = pendingUsers.filter(user => selectedUsers.includes(user.id))
    setActionDialog({ isOpen: true, type: 'bulk', users: selectedUserObjects })
  }

  const confirmApprove = () => {
    if (actionDialog.type === 'approve' && actionDialog.user) {
      approveUser({ userId: actionDialog.user.id })
    } else if (actionDialog.type === 'bulk' && actionDialog.users) {
      bulkAction({
        type: 'approve',
        targetIds: actionDialog.users.map(u => u.id)
      })
    }
    setActionDialog({ isOpen: false, type: 'approve' })
  }

  const confirmReject = (reason: string) => {
    if (actionDialog.type === 'reject' && actionDialog.user) {
      rejectUser({ userId: actionDialog.user.id, reason })
    } else if (actionDialog.type === 'bulk' && actionDialog.users) {
      bulkAction({
        type: 'reject',
        targetIds: actionDialog.users.map(u => u.id),
        reason
      })
    }
    setActionDialog({ isOpen: false, type: 'approve' })
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
      selectedUsers.length === filteredUsers.length
        ? []
        : filteredUsers.map(user => user.id)
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending User Registrations
          </CardTitle>
          <CardDescription>
            Review and approve user registration requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="2">Low Risk</SelectItem>
                <SelectItem value="5">Medium Risk</SelectItem>
                <SelectItem value="8">High Risk</SelectItem>
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
                  onClick={() => handleBulkAction('approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('reject')}
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Reject Selected
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
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={selectAllUsers}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading pending users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No pending users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
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
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <span className="text-sm font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
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
                        {getRiskBadge(user.riskScore)}
                        <div className="text-xs text-muted-foreground mt-1">
                          Score: {user.riskScore}/10
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(user.registrationDate), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          IP: {user.registrationIP}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.flags.map((flag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
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
                            <DropdownMenuItem
                              onClick={() => handleApproveUser(user)}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRejectUser(user)}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject User
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

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialog.isOpen} onOpenChange={(open) =>
        !open && setActionDialog({ isOpen: false, type: 'approve' })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'approve' && 'Approve User'}
              {actionDialog.type === 'reject' && 'Reject User'}
              {actionDialog.type === 'bulk' && `Bulk ${actionDialog.users?.[0] ? 'Approve' : 'Reject'} Users`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'approve' && (
                <>Are you sure you want to approve {actionDialog.user?.name}? They will gain access to the platform immediately.</>
              )}
              {actionDialog.type === 'reject' && (
                <>Are you sure you want to reject {actionDialog.user?.name}? This action cannot be undone.</>
              )}
              {actionDialog.type === 'bulk' && (
                <>Are you sure you want to {selectedUsers.length > 0 ? 'approve' : 'reject'} {selectedUsers.length} selected users?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              className={actionDialog.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {actionDialog.type === 'approve' && 'Approve'}
              {actionDialog.type === 'reject' && 'Reject'}
              {actionDialog.type === 'bulk' && `Confirm`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PendingRegistrations