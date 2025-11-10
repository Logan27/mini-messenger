import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, MessageSquare, HardDrive, Phone, Activity, CheckCheck } from 'lucide-react';
import axios from 'axios';

interface DashboardStats {
  users: {
    total: number;
    pending: number;
    approved: number;
    active: number;
    online: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  storage: {
    total: number;
    byType: Array<{ mimeType: string; totalSize: number; count: number }>;
    topUsers: Array<{ userId: string; totalSize: number }>;
  };
  messages: {
    total: number;
    last24h: number;
    last7d: number;
  };
  calls: {
    total: number;
    active: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  groups: {
    total: number;
    active: number;
  };
  activity: {
    dailyMessages: Array<{ date: string; count: number }>;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
        const token = localStorage.getItem('accessToken');

        const response = await axios.get(`${apiUrl}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setStats(response.data.data);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load dashboard statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleApproveAll = async () => {
    if (!stats?.users.pending || stats.users.pending === 0) return;

    if (!confirm(`Are you sure you want to approve all ${stats.users.pending} pending users?`)) {
      return;
    }

    setIsApprovingAll(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      // Batch approve all pending users
      const response = await axios.post(
        `${apiUrl}/admin/users/approve-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { approvedCount, message } = response.data.data;

      // Refresh stats
      const statsResponse = await axios.get(`${apiUrl}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsResponse.data.data);

      // Show success message
      if (approvedCount > 0) {
        alert(`Successfully approved ${approvedCount} user(s)`);
      } else {
        alert(message || 'No pending users to approve');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message || 'Failed to approve all users');
    } finally {
      setIsApprovingAll(false);
    }
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your messenger system
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered accounts
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.users.online || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Online now
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold">{stats?.users.pending || 0}</div>
                    {stats && stats.users.pending > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleApproveAll}
                        disabled={isApprovingAll}
                        className="h-7 text-xs"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        {isApprovingAll ? 'Approving...' : 'Approve All'}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Messages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.messages.last24h || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Last 24 hours
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Usage
              </CardTitle>
              <CardDescription>
                File uploads and attachments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatBytes(stats?.storage.total || 0)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Used
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.storage.byType.length || 0} file types
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Groups Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Groups
              </CardTitle>
              <CardDescription>
                Group chat statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Groups</span>
                    <span className="text-sm font-medium">
                      {stats?.groups.total || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Groups</span>
                    <span className="text-sm font-medium text-green-600">
                      {stats?.groups.active || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm">Messages (7 days)</span>
                    <span className="text-sm font-medium">
                      {stats?.messages.last7d || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Calls */}
        {stats && stats.calls.active > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Active Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.calls.active}</div>
              <p className="text-sm text-muted-foreground">
                Ongoing voice/video calls
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
