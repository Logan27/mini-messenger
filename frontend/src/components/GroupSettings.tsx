import { useState, useEffect, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Camera, Loader2, Save, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface GroupSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isAdmin: boolean;
  isCreator: boolean;
  onGroupUpdated?: () => void;
  onGroupDeleted?: () => void;
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  creatorId: string;
  createdAt: string;
}

export function GroupSettings({
  open,
  onOpenChange,
  groupId,
  isAdmin,
  isCreator,
  onGroupUpdated,
  onGroupDeleted,
}: GroupSettingsProps) {
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form fields
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState<string | null>(null);
  
  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && groupId) {
      fetchGroupData();
    }
  }, [open, groupId]);

  const fetchGroupData = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const response = await axios.get(`${apiUrl}/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      setGroupData(data);
      setGroupName(data.name || '');
      setGroupDescription(data.description || '');
      setGroupAvatar(data.avatar || '');
    } catch (err) {
      toast.error('Failed to load group settings');
      console.error('Error fetching group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Avatar must be an image');
      return;
    }

    setNewAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!newAvatarFile) return null;

    setIsUploading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const formData = new FormData();
      formData.append('file', newAvatarFile);

      const response = await axios.post(`${apiUrl}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.url || response.data.fileName;
    } catch (err) {
      toast.error('Failed to upload avatar');
      console.error('Avatar upload error:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    if (groupName.trim().length < 3) {
      toast.error('Group name must be at least 3 characters');
      return;
    }

    if (groupName.trim().length > 100) {
      toast.error('Group name must be less than 100 characters');
      return;
    }

    if (groupDescription.length > 500) {
      toast.error('Description must be less than 500 characters');
      return;
    }

    setIsSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      // Upload new avatar if selected
      let avatarUrl = groupAvatar;
      if (newAvatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      // Update group
      const updateData: Record<string, unknown> = {
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
      };

      if (avatarUrl && avatarUrl !== groupData?.avatar) {
        updateData.avatar = avatarUrl;
      }

      await axios.put(`${apiUrl}/groups/${groupId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Group settings updated successfully');
      onGroupUpdated?.();
      onOpenChange(false);
      
      // Reset form
      setNewAvatarFile(null);
      setNewAvatarPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update group settings');
      console.error('Error updating group:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.delete(`${apiUrl}/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Group deleted successfully');
      setConfirmDelete(false);
      onOpenChange(false);
      onGroupDeleted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group');
      console.error('Error deleting group:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (groupData) {
      setGroupName(groupData.name || '');
      setGroupDescription(groupData.description || '');
      setGroupAvatar(groupData.avatar || '');
    }
    setNewAvatarFile(null);
    setNewAvatarPreview(null);
    onOpenChange(false);
  };

  const hasChanges = () => {
    if (!groupData) return false;
    return (
      groupName.trim() !== groupData.name ||
      groupDescription.trim() !== (groupData.description || '') ||
      newAvatarFile !== null
    );
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

  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Only group admins can edit group settings
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
            <DialogDescription>
              Edit group name, description, and avatar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={newAvatarPreview || groupAvatar} />
                  <AvatarFallback>
                    <Users className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Click camera icon to change avatar (Max 5MB)
              </p>
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="groupName">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                maxLength={100}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                {groupName.length}/100 characters
              </p>
            </div>

            {/* Group Description */}
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description (Optional)</Label>
              <Textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
                maxLength={500}
                rows={4}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                {groupDescription.length}/500 characters
              </p>
            </div>

            {/* Creator-only: Delete Group */}
            {isCreator && (
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-destructive">Danger Zone</Label>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isSaving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete this group and all its messages. This action cannot be
                    undone.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges() || isSaving || isUploading}
            >
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{groupData.name}</strong>? This action
              cannot be undone. All messages and member data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Group
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
