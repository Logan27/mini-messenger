import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Loader2, 
  UserX, 
  UserCheck, 
  Eye,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'user' | 'admin';
  lastLogin?: string;
  createdAt: string;
}

interface UserDetails extends User {
  messageCount?: number;
  callCount?: number;
  storageUsed?: number;
  lastActivity?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState('');

  // Deactivate/Reactivate dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'reactivate'>('deactivate');
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // User details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');
      
      const response = await axios.get(`${apiUrl}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(response.data.data.users || []);
      setFilteredUsers(response.data.data.users || []);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setIsLoadingDetails(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const response = await axios.get(`${apiUrl}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserDetails(response.data.data || response.data);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to load user details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenUserDetails = (user: User) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
    fetchUserDetails(user.id);
  };

  const handleDeactivateClick = (user: User) => {
    setSelectedUser(user);
    setActionType('deactivate');
    setActionReason('');
    setActionDialogOpen(true);
  };

  const handleReactivateClick = (user: User) => {
    setSelectedUser(user);
    setActionType('reactivate');
    setActionReason('');
    setActionDialogOpen(true);
  };

  const handleActionConfirm = async () => {
    if (!selectedUser) return;

    if (actionType === 'deactivate' && !actionReason.trim()) {
      toast.error('Please provide a reason for deactivation');
      return;
    }

    setIsProcessing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');
      
      const endpoint = actionType === 'deactivate' 
        ? `${apiUrl}/admin/users/${selectedUser.id}/deactivate`
        : `${apiUrl}/admin/users/${selectedUser.id}/reactivate`;

      await axios.put(
        endpoint,
        actionType === 'deactivate' ? { reason: actionReason } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(
        `User ${actionType === 'deactivate' ? 'deactivated' : 'reactivated'} successfully`
      );
      
      // Update user in list
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, status: actionType === 'deactivate' ? 'inactive' : 'active' }
          : u
      ));
      
      setActionDialogOpen(false);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || `Failed to ${actionType} user`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportUsers = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');
      
      const response = await axios.get(`${apiUrl}/admin/users/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Users exported successfully');
    } catch (err) {
      toast.error('Failed to export users');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      pending: 'secondary',
      inactive: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === 'admin' ? 'default' : 'outline'}>
        {role}
      </Badge>
    );
  };

  const formatBytes = (bytes: number = 0): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage all user accounts
            </p>
          </div>
          <Button onClick={handleExportUsers}>
            <Download className="mr-2 h-4 w-4" />
            Export Users
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filters
            </CardTitle>
            <CardDescription>
              Filter users by search, status, and role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              View and manage user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                    ? 'No users match your filters'
                    : 'No users found'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {user.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            {user.firstName && user.lastName && (
                              <div className="text-sm text-muted-foreground">
                                {user.firstName} {user.lastName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.lastLogin
                          ? format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenUserDetails(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user.status === 'active' && user.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivateClick(user)}
                              disabled={isProcessing}
                            >
                              <UserX className="mr-1 h-4 w-4" />
                              Deactivate
                            </Button>
                          )}
                          {user.status === 'inactive' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleReactivateClick(user)}
                              disabled={isProcessing}
                            >
                              <UserCheck className="mr-1 h-4 w-4" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog (Deactivate/Reactivate) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'} User
            </DialogTitle>
            <DialogDescription>
              {actionType === 'deactivate'
                ? `Deactivating ${selectedUser?.username} will immediately log them out and prevent them from accessing the system.`
                : `Reactivating ${selectedUser?.username} will allow them to access the system again.`}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'deactivate' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Deactivation *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for deactivation..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <Alert>
                <AlertDescription>
                  The user will receive an email notification with this reason.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'deactivate' ? 'destructive' : 'default'}
              onClick={handleActionConfirm}
              disabled={isProcessing || (actionType === 'deactivate' && !actionReason.trim())}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4 py-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : userDetails ? (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="font-medium">{userDetails.username}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{userDetails.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(userDetails.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <div className="mt-1">{getRoleBadge(userDetails.role)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Registered</Label>
                    <p className="font-medium">
                      {format(new Date(userDetails.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Login</Label>
                    <p className="font-medium">
                      {userDetails.lastLogin
                        ? format(new Date(userDetails.lastLogin), 'MMM d, yyyy HH:mm')
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div>
                <h3 className="font-semibold mb-3">Activity Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Messages</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {userDetails.messageCount || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Calls</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {userDetails.callCount || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Storage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatBytes(userDetails.storageUsed)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Failed to load user details</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
