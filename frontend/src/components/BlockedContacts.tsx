import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from './EmptyState';
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
import { UserX, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';

interface BlockedUser {
  id: string; // user ID for display
  contactId: string; // contact record ID for API calls
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  blockedAt: string;
}

export function BlockedContacts() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingUser, setUnblockingUser] = useState<BlockedUser | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const response = await axios.get(`${apiUrl}/contacts?status=blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Map backend response to BlockedUser format
      const blocked = response.data.data?.map((contact: any) => ({
        id: contact.user?.id || contact.userId, // user ID for display
        contactId: contact.id, // contact record ID for API calls
        username: contact.user?.username || 'Unknown',
        firstName: contact.user?.firstName,
        lastName: contact.user?.lastName,
        avatar: contact.user?.profilePicture,
        blockedAt: contact.blockedAt || contact.createdAt,
      })) || [];

      setBlockedUsers(blocked);
    } catch (err) {
      console.error('Failed to load blocked contacts:', err);
      toast.error('Failed to load blocked contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!unblockingUser) return;

    setIsProcessing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.post(
        `${apiUrl}/contacts/${unblockingUser.contactId}/unblock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`${unblockingUser.username} has been unblocked`);
      
      // Remove from list
      setBlockedUsers(prev => prev.filter(user => user.id !== unblockingUser.id));
      setUnblockingUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unblock user');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Blocked Contacts
          </CardTitle>
          <CardDescription>
            Manage users you've blocked. Blocked users cannot send you messages or call you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : blockedUsers.length === 0 ? (
            <EmptyState
              icon={ShieldOff}
              title="No blocked contacts"
              description="When you block someone, they won't be able to contact you. You can manage blocked users here."
            />
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
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
                      <div className="text-xs text-muted-foreground mt-1">
                        Blocked on {format(new Date(user.blockedAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setUnblockingUser(user)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unblock Confirmation Dialog */}
      <AlertDialog open={!!unblockingUser} onOpenChange={() => !isProcessing && setUnblockingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {unblockingUser?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be able to send you messages and call you again. You can block
              them again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock} disabled={isProcessing}>
              {isProcessing ? 'Unblocking...' : 'Unblock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
