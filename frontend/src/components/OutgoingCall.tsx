import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Phone, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { socketService } from '@/services/socket.service';
import { getAvatarUrl } from '@/lib/avatar-utils';

interface OutgoingCallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  callType: 'video' | 'voice';
  onCallAccepted?: (callId: string) => void;
}

export function OutgoingCall({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  recipientAvatar,
  callType,
  onCallAccepted,
}: OutgoingCallProps) {
  const [callId, setCallId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callEnded, setCallEnded] = useState(false); // Track if call was ended/timed out
  const [callInitiated, setCallInitiated] = useState(false); // Track if we already initiated

  // Initiate call when dialog opens
  useEffect(() => {
    if (open && !callInitiated) {
      initiateCall();
      setElapsedSeconds(0);
      setCallEnded(false);
      setCallInitiated(true);
    }
    
    if (!open) {
      // Reset state when dialog closes
      setCallId(null);
      setElapsedSeconds(0);
      setCallEnded(false);
      setCallInitiated(false);
    }
  }, [open, callInitiated]);

  // Listen for call response (accept/reject)
  useEffect(() => {
    if (!open || !callId) return;

    const unsubscribeResponse = socketService.on('call.response', (data: unknown) => {
      console.log('📞 Outgoing call - response received:', data);
      
      if (data.callId === callId) {
        const { response, call } = data;
        const recipientName = call?.recipient?.username || call?.recipient?.firstName || 'User';
        
        if (response === 'accept') {
          toast.success(`${recipientName} accepted your call`);
          setCallEnded(true);
          onCallAccepted?.(data.callId);
          onOpenChange(false);
        } else if (response === 'reject') {
          toast.error(`${recipientName} rejected your call`);
          setCallEnded(true);
          onOpenChange(false);
        }
      }
    });

    return () => {
      unsubscribeResponse();
    };
  }, [open, callId, onCallAccepted, onOpenChange]);

  // Timer for auto-cancel after 60 seconds
  useEffect(() => {
    if (!open || !callId) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        if (next >= 60) {
          // Auto-cancel after 60 seconds
          setCallEnded(true); // Mark call as ended
          handleCancel();
          toast.error('Call timed out');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, callId]);

  const initiateCall = async () => {
    setIsCalling(true);
    try {
      // Force rebuild - using apiClient with automatic auth
      const response = await apiClient.post('/calls', {
        recipientId,
        callType: callType === 'voice' ? 'audio' : callType,
      });

      setCallId(response.data.data.id);
      
      // Listen for call status updates via WebSocket
      // This would be handled by a useSocket hook
      // For now, we'll just wait for the call to be accepted
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to initiate call';
      toast.error(errorMsg);
      onOpenChange(false);
    } finally {
      setIsCalling(false);
    }
  };

  const cancelCall = async () => {
    if (!callId) return;

    try {
      await apiClient.post(`/calls/${callId}/end`, {});
    } catch (err) {
      console.error('Failed to cancel call:', err);
    }
  };

  const handleCancel = async () => {
    setCallEnded(true); // Mark call as ended before canceling
    await cancelCall();
    onOpenChange(false);
  };

  const handleDialogChange = async (open: boolean) => {
    if (!open && !callEnded) {
      // User is closing dialog without accepting/rejecting - cancel the call
      console.log('📞 Closing outgoing call dialog - cancelling call');
      await handleCancel();
    } else {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">
          Calling {recipientName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {callType === 'voice' ? 'Audio' : 'Video'} call to {recipientName} is in progress. Cancel to end the call.
        </DialogDescription>
        <div className="flex flex-col items-center gap-6 py-8">
          {/* Recipient Avatar */}
          <Avatar className="h-32 w-32 ring-4 ring-primary/20">
            <AvatarImage src={getAvatarUrl(recipientAvatar)} alt={recipientName} />
            <AvatarFallback className="text-3xl">
              {recipientName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Recipient Name */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold">{recipientName}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {callType === 'video' ? (
                <Video className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Phone className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-muted-foreground">
                {isCalling ? 'Initiating call...' : 'Calling...'}
              </p>
            </div>
          </div>

          {/* Timer */}
          {!isCalling && (
            <div className="text-sm text-muted-foreground">
              {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
            </div>
          )}

          {/* Loading Indicator */}
          {isCalling && (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}

          {/* Cancel Button */}
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-16 w-16"
            onClick={handleCancel}
            disabled={isCalling}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
