import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Users,
  UserPlus,
  UserMinus,
  Shield,
  ShieldOff,
  LogOut,
  Loader2,
  Crown,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';

interface GroupMember {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface GroupInfoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isAdmin: boolean;
  isCreator: boolean;
  onLeaveGroup?: () => void;
}

export function GroupInfo({
  open,
  onOpenChange,
  groupId,
  isAdmin,
  isCreator,
  onLeaveGroup,
}: GroupInfoProps) {
  const [groupData, setGroupData] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Action dialogs
  const [removeMember, setRemoveMember] = useState<GroupMember | null>(null);
  const [promoteMember, setPromoteMember] = useState<GroupMember | null>(null);
  const [demoteMember, setDemoteMember] = useState<GroupMember | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Add members
  const [showAddMembers, setShowAddMembers] = useState(false);
  
  // Rename group
  const [isRenaming, setIsRenaming] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [availableContacts, setAvailableContacts] = useState<unknown[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && groupId) {
      fetchGroupInfo();
    }
  }, [open, groupId]);

  const fetchGroupInfo = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const [groupResponse, membersResponse] = await Promise.all([
        axios.get(`${apiUrl}/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${apiUrl}/groups/${groupId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setGroupData(groupResponse.data.data || groupResponse.data);

      // Transform members data from backend format
      const rawMembers = membersResponse.data.data?.members || membersResponse.data.members || [];
      const transformedMembers = rawMembers.map((m: unknown) => ({
        id: m.user?.id || m.id,
        username: m.user?.username || m.username,
        firstName: m.user?.firstName || m.firstName,
        lastName: m.user?.lastName || m.lastName,
        avatar: m.user?.avatar || m.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
      }));
      setMembers(transformedMembers);
    } catch (err) {
      console.error('Failed to load group information:', err);

      // If user is not a member (403) or group not found (404), close the dialog
      if (err.response?.status === 403 || err.response?.status === 404) {
        toast.error(err.response?.data?.message || 'You do not have access to this group');
        onOpenChange(false);
        return;
      }

      toast.error('Failed to load group information');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableContacts = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const response = await axios.get(`${apiUrl}/contacts?status=accepted`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Filter out users already in group
      const memberIds = new Set(members.map(m => m.id));
      const available = (response.data.data || []).filter((contact: unknown) => !memberIds.has((contact as Record<string, unknown>).user?.id as string));
      setAvailableContacts(available);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      toast.error('Failed to load contacts');
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember) return;

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.delete(`${apiUrl}/groups/${groupId}/members/${removeMember.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`${removeMember.username} removed from group`);
      setMembers(prev => prev.filter(m => m.id !== removeMember.id));
      setRemoveMember(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteMember = async () => {
    if (!promoteMember) return;

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.put(
        `${apiUrl}/groups/${groupId}/members/${promoteMember.id}/role`,
        { role: 'admin' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${promoteMember.username} promoted to admin`);
      setMembers(prev =>
        prev.map(m => (m.id === promoteMember.id ? { ...m, role: 'admin' } : m))
      );
      setPromoteMember(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to promote member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteMember = async () => {
    if (!demoteMember) return;

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.put(
        `${apiUrl}/groups/${groupId}/members/${demoteMember.id}/role`,
        { role: 'member' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${demoteMember.username} demoted to member`);
      setMembers(prev =>
        prev.map(m => (m.id === demoteMember.id ? { ...m, role: 'member' } : m))
      );
      setDemoteMember(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to demote member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || newGroupName === groupData.name) {
      setIsRenaming(false);
      return;
    }

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const response = await axios.put(
        `${apiUrl}/groups/${groupId}`,
        { name: newGroupName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Group name updated successfully');
      setGroupData(prev => ({ ...prev, name: newGroupName.trim() }));
      setIsRenaming(false);
      setNewGroupName('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedContacts.size === 0) return;

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      // Add each member individually
      const promises = Array.from(selectedContacts).map(userId =>
        axios.post(
          `${apiUrl}/groups/${groupId}/members`,
          { userId },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      await Promise.all(promises);

      toast.success(`${selectedContacts.size} member(s) added to group`);
      setShowAddMembers(false);
      setSelectedContacts(new Set());
      fetchGroupInfo(); // Refresh member list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add members');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.post(
        `${apiUrl}/groups/${groupId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Left group successfully');
      setConfirmLeave(false);
      onOpenChange(false);
      onLeaveGroup?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.delete(`${apiUrl}/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Group deleted successfully');
      setConfirmDelete(false);
      onOpenChange(false);
      onLeaveGroup?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || !groupData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Information
            </DialogTitle>
            <DialogDescription>
              {members.length} members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Group Details */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={groupData.avatar} />
                <AvatarFallback>
                  <Users className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter new group name"
                      maxLength={100}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameGroup();
                        if (e.key === 'Escape') {
                          setIsRenaming(false);
                          setNewGroupName('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleRenameGroup}
                      disabled={actionLoading || !newGroupName.trim()}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsRenaming(false);
                        setNewGroupName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{groupData.name}</h3>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNewGroupName(groupData.name);
                          setIsRenaming(true);
                        }}
                        title="Rename group"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                {groupData.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {groupData.description}
                  </p>
                )}
                {groupData.createdAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {format(new Date(groupData.createdAt), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Members List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Members ({members.length})</Label>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      fetchAvailableContacts();
                      setShowAddMembers(true);
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Members
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.username?.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.username}</span>
                            {member.role === 'admin' && (
                              <Badge variant="default" className="text-xs">
                                <Shield className="mr-1 h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                            {groupData.creatorId === member.id && (
                              <Badge variant="secondary" className="text-xs">
                                <Crown className="mr-1 h-3 w-3" />
                                Creator
                              </Badge>
                            )}
                          </div>
                          {member.firstName && member.lastName && (
                            <div className="text-sm text-muted-foreground">
                              {member.firstName} {member.lastName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Member Actions (Admin only) */}
                      {isAdmin && groupData.creatorId !== member.id && (
                        <div className="flex gap-1">
                          {member.role === 'member' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPromoteMember(member)}
                              title="Promote to admin"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          ) : isCreator ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDemoteMember(member)}
                              title="Demote to member"
                            >
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRemoveMember(member)}
                            title="Remove from group"
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div>
              {!isCreator && (
                <Button variant="destructive" onClick={() => setConfirmLeave(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Group
                </Button>
              )}
              {isCreator && (
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  Delete Group
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
            <DialogDescription>
              Select contacts to add to the group
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {availableContacts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No available contacts to add
                  </p>
                </div>
              ) : (
                availableContacts.map((contact: unknown) => {
                  const c = contact as Record<string, Record<string, unknown>>;
                  return (
                  <div
                    key={c.user.id as string}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => {
                      const newSelected = new Set(selectedContacts);
                      const userId = c.user.id as string;
                      if (newSelected.has(userId)) {
                        newSelected.delete(userId);
                      } else {
                        newSelected.add(userId);
                      }
                      setSelectedContacts(newSelected);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(c.user.id as string)}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={c.user.profilePicture as string} />
                      <AvatarFallback>
                        {(c.user.username as string)?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {(c as Record<string, unknown>).nickname as string || c.user.username as string}
                      </div>
                      {c.user.firstName && c.user.lastName && (
                        <div className="text-sm text-muted-foreground">
                          {c.user.firstName as string} {c.user.lastName as string}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMembers(false);
                setSelectedContacts(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedContacts.size === 0 || actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedContacts.size} Member{selectedContacts.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeMember?.username} from this group? They
              will no longer be able to see group messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Member Confirmation */}
      <AlertDialog open={!!promoteMember} onOpenChange={() => setPromoteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote {promoteMember?.username} to admin? They will
              be able to add/remove members and manage group settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromoteMember} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Member Confirmation */}
      <AlertDialog open={!!demoteMember} onOpenChange={() => setDemoteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote to Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to demote {demoteMember?.username} to a regular member?
              They will lose admin privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDemoteMember} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Demote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You won't be able to see new
              messages unless an admin adds you back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be undone. All
              messages and member data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
