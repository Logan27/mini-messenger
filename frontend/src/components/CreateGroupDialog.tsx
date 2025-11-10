import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { groupService } from '@/services/group.service';

interface Contact {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  online: boolean;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onGroupCreated?: (groupId: string) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  contacts,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'details' | 'members'>('details');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Avatar must be an image file');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const toggleMember = (contactId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedMembers(newSelected);
  };

  const validateDetails = (): boolean => {
    setError('');

    if (!groupName.trim()) {
      setError('Group name is required');
      return false;
    }

    if (groupName.trim().length < 3) {
      setError('Group name must be at least 3 characters');
      return false;
    }

    if (groupName.trim().length > 100) {
      setError('Group name must be less than 100 characters');
      return false;
    }

    if (description.length > 500) {
      setError('Description must be less than 500 characters');
      return false;
    }

    return true;
  };

  const validateMembers = (): boolean => {
    setError('');

    if (selectedMembers.size < 1) {
      setError('Please select at least 1 other member (minimum 2 participants including you)');
      return false;
    }

    if (selectedMembers.size > 19) {
      setError('Maximum 19 members can be added (20 including you)');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateDetails()) return;
    setStep('members');
  };

  const handleBack = () => {
    setStep('details');
    setError('');
  };

  const handleCreate = async () => {
    if (!validateMembers()) return;

    setIsCreating(true);
    setError('');

    try {
      // Prepare request body
      const requestBody: Record<string, unknown> = {
        name: groupName.trim(),
        initialMembers: Array.from(selectedMembers),
      };

      if (description.trim()) {
        requestBody.description = description.trim();
      }

      // Note: Avatar file upload not yet supported by backend
      // Backend expects avatar as URL string, not file
      if (avatarFile) {
        // TODO: Upload avatar file first, then include URL in requestBody.avatar
        console.warn('Avatar file upload not yet implemented');
      }

      const group = await groupService.createGroup(requestBody);

      toast.success('Group created successfully');

      // Invalidate conversations query to show the new group
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Reset form
      setGroupName('');
      setDescription('');
      setAvatarFile(null);
      setAvatarPreview('');
      setSelectedMembers(new Set());
      setStep('details');

      onOpenChange(false);

      // Navigate to new group chat
      if (onGroupCreated && group?.id) {
        onGroupCreated(group.id);
      }
    } catch (err) {
      // Handle both string and object error formats from backend
      let errorMsg = 'Failed to create group';
      
      if (err.response?.data?.error) {
        const error = err.response.data.error;
        // If error is an object with message property, extract it
        errorMsg = typeof error === 'object' && error.message ? error.message : String(error);
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setGroupName('');
      setDescription('');
      setAvatarFile(null);
      setAvatarPreview('');
      setSelectedMembers(new Set());
      setStep('details');
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create New Group
          </DialogTitle>
          <DialogDescription>
            {step === 'details'
              ? 'Enter group details'
              : `Select members (${selectedMembers.size}/19 selected)`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'details' ? (
          <div className="space-y-6 py-4">
            {/* Group Avatar */}
            <div className="space-y-2">
              <Label>Group Avatar (Optional)</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback>
                    <Users className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Max 5MB. Recommended: 512x512px square image.
              </p>
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                {groupName.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No contacts available. Add some contacts first.
                    </p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => toggleMember(contact.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedMembers.has(contact.id)}
                          onCheckedChange={() => toggleMember(contact.id)}
                        />
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback>
                            {contact.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{contact.username}</div>
                          {contact.firstName && contact.lastName && (
                            <div className="text-sm text-muted-foreground">
                              {contact.firstName} {contact.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                      {contact.online && (
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> You'll be added as the group admin. Selected members
                will be able to see all group messages.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'details' ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={isCreating}>
                Next: Select Members
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isCreating}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Group ({selectedMembers.size + 1} members)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
