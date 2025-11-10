import { useContacts, useAcceptContact, useRejectContact, useRemoveContact } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserPlus, UserX, Loader2, Clock, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export function PendingContactRequests() {
  const { user: currentUser } = useAuth();
  const { data: pendingRequests, isLoading } = useContacts('pending');
  const acceptContact = useAcceptContact();
  const rejectContact = useRejectContact();
  const removeContact = useRemoveContact();
  const { toast } = useToast();

  const handleAccept = async (contactId: string, username: string) => {
    try {
      await acceptContact.mutateAsync(contactId);
      toast({
        title: "Contact request accepted",
        description: `${username} is now your contact`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to accept request",
        description: error.response?.data?.message || "Please try again",
      });
    }
  };

  const handleReject = async (contactId: string, username: string) => {
    try {
      await rejectContact.mutateAsync(contactId);
      toast({
        title: "Contact request rejected",
        description: `You rejected the request from ${username}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to reject request",
        description: error.response?.data?.message || "Please try again",
      });
    }
  };

  const handleCancel = async (contactId: string, username: string) => {
    try {
      await removeContact.mutateAsync(contactId);
      toast({
        title: "Contact request cancelled",
        description: `Your request to ${username} has been cancelled`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to cancel request",
        description: error.response?.data?.message || "Please try again",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase">
        Pending Requests ({pendingRequests.length})
      </h3>
      {pendingRequests.map((request: unknown) => {
        // Check if current user is the sender (outgoing request) or recipient (incoming request)
        const isOutgoingRequest = request.userId === currentUser?.id;
        const isIncomingRequest = request.contactUserId === currentUser?.id;
        
        // Get the correct user data
        const userToShow = request.user;
        const username = userToShow?.username || 'Unknown User';
        const isOnline = userToShow?.onlineStatus === 'online';
        
        // Use profilePicture if available, otherwise generate avatar
        const avatarUrl = userToShow?.profilePicture 
          ? (userToShow.profilePicture.startsWith('http') 
              ? userToShow.profilePicture 
              : `http://localhost:4000${userToShow.profilePicture}`)
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        
        // Parse and format the timestamp properly
        let timeAgo = 'just now';
        try {
          if (request.createdAt) {
            const date = new Date(request.createdAt);
            if (!isNaN(date.getTime())) {
              timeAgo = formatDistanceToNow(date, { addSuffix: true });
            }
          }
        } catch (error) {
          console.error('Error formatting date:', error, request);
        }

        return (
          <Card key={request.id} className="p-3">
            <div className="space-y-3">
              {/* First line: Avatar and Name */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      src={avatarUrl}
                      alt={username}
                    />
                    <AvatarFallback>
                      {username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{username}</p>
                    {isOnline && (
                      <span className="text-xs text-green-600 font-medium">Online</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo}
                  </p>
                </div>
              </div>
              
              {/* Second line: Buttons */}
              <div className="flex items-center gap-2">
                {isIncomingRequest && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      onClick={() => handleAccept(request.id, username)}
                      disabled={acceptContact.isPending || rejectContact.isPending}
                    >
                      {acceptContact.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => handleReject(request.id, username)}
                      disabled={acceptContact.isPending || rejectContact.isPending}
                    >
                      {rejectContact.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </>
                )}
                {isOutgoingRequest && (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground flex-1 py-1.5 bg-muted/50 rounded-md justify-center">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Pending</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                      onClick={() => handleCancel(request.id, username)}
                      disabled={removeContact.isPending}
                    >
                      {removeContact.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
