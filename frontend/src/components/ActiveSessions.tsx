import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, MapPin, Clock, Shield, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Remove /api from paths since VITE_API_URL already includes it
const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

interface Session {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActivity: string;
  isCurrent: boolean;
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSessions(response.data.data?.sessions || []);
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load active sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const getDeviceIcon = (deviceType: Session['deviceType']) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const handleRevokeSession = async (session: Session) => {
    setIsRevoking(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.delete(`${API_URL}/api/auth/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast.success('Session revoked successfully');
      setRevokeDialogOpen(false);
      setSessionToRevoke(null);
    } catch (error: any) {
      console.error('Failed to revoke session:', error);
      toast.error('Failed to revoke session');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    setIsRevoking(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.delete(`${API_URL}/api/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Keep only current session
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success('All other sessions revoked successfully');
      setRevokeAllDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to revoke sessions:', error);
      toast.error('Failed to revoke sessions');
    } finally {
      setIsRevoking(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage devices that are logged into your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage devices that are logged into your account (max 5)
              </CardDescription>
            </div>
            {otherSessionsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokeAllDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Revoke All Others
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length >= 5 && (
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You've reached the maximum of 5 active sessions. Logging in from a new device will
                automatically revoke the oldest session.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {sessions.map((session, index) => (
              <div key={session.id}>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">
                        {session.browser} on {session.os}
                      </h4>
                      {session.isCurrent && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Current Session
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{session.location}</span>
                        <span className="text-xs">•</span>
                        <span>{session.ip}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Last active{' '}
                          {formatDistanceToNow(new Date(session.lastActivity), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSessionToRevoke(session);
                        setRevokeDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  )}
                </div>
                {index < sessions.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active sessions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revoke Single Session Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this session? You'll need to log in again on that
              device.
              {sessionToRevoke && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                  <p className="font-medium text-foreground">
                    {sessionToRevoke.browser} on {sessionToRevoke.os}
                  </p>
                  <p className="text-muted-foreground mt-1">{sessionToRevoke.location}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToRevoke && handleRevokeSession(sessionToRevoke)}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Other Sessions Dialog */}
      <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke All Other Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke all {otherSessionsCount} other session
              {otherSessionsCount !== 1 ? 's' : ''}? You'll need to log in again on those devices.
              Your current session will remain active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllOthers}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke All Others
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
