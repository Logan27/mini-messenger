import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Phone, X, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { socketService } from '@/services/socket.service';
import { getAvatarUrl } from '@/lib/avatar-utils';

// Check notification settings before showing notification
async function shouldShowNotification(): Promise<boolean> {
  try {
    const response = await apiClient.get('/notification-settings');
    const settings = response.data?.data?.settings;

    if (!settings) {
      return true; // Default to showing if settings not available
    }

    // Check global toggle
    if (settings.inAppEnabled === false) {
      return false;
    }

    // Check Do Not Disturb
    if (settings.doNotDisturb === true) {
      return false;
    }

    // Check push notifications
    if (settings.pushEnabled === false) {
      return false;
    }

    // Check call notifications specifically
    if (settings.callNotifications === false) {
      return false;
    }

    // Check quiet hours
    if (settings.quietHoursStart && settings.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Normalize time strings to HH:MM format (backend may return HH:MM:SS)
      const normalizeTime = (time: string) => time.substring(0, 5);
      const quietHoursStart = normalizeTime(settings.quietHoursStart);
      const quietHoursEnd = normalizeTime(settings.quietHoursEnd);

      const isQuietTime = quietHoursStart > quietHoursEnd
        ? (currentTime >= quietHoursStart || currentTime <= quietHoursEnd)
        : (currentTime >= quietHoursStart && currentTime <= quietHoursEnd);

      if (isQuietTime) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ IncomingCall: Failed to check notification settings:', error);
    return true; // Default to showing on error
  }
}

interface IncomingCallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'voice';
  onCallAccepted?: (callId: string) => void;
  onCallRejected?: () => void;
}

export function IncomingCall({
  open,
  onOpenChange,
  callId,
  callerId,
  callerName,
  callerAvatar,
  callType,
  onCallAccepted,
  onCallRejected,
}: IncomingCallProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) {
      setElapsedSeconds(0);
      playRingtone();

      // Show browser notification if supported and allowed by settings
      if ('Notification' in window && Notification.permission === 'granted') {
        shouldShowNotification().then((shouldShow) => {
          if (shouldShow) {
            new Notification(`Incoming ${callType} call`, {
              body: `${callerName} is calling...`,
              icon: callerAvatar,
              tag: `call-${callId}`,
            });
          }
        });
      }

      // Listen for call.ended event (caller cancelled)
      const unsubscribeEnded = socketService.on('call.ended', (data: unknown) => {
        if (data.callId === callId) {
          stopRingtone();
          onOpenChange(false);
          toast.info(`${callerName} cancelled the call`);
        }
      });

      return () => {
        stopRingtone();
        unsubscribeEnded();
      };
    } else {
      stopRingtone();
    }
  }, [open, callId, callerName, onOpenChange]);

  // Timer for auto-dismiss after 60 seconds
  useEffect(() => {
    if (!open) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        if (next >= 60) {
          // Auto-dismiss after 60 seconds
          handleMissed();
          toast.error('Missed call from ' + callerName);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  const playRingtone = () => {
    try {
      // Play "Fly Me to the Moon" MP3 ringtone
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.volume = 0.5; // 50% volume

      // Play the audio
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
          })
          .catch((err) => {
          });
      }

      // Store audio element for cleanup
      audioRef.current = audio;

    } catch (err) {
      console.error('Ringtone playback error:', err.message);
    }
  };

  const stopRingtone = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (err) {
        // Error stopping ringtone
      }
      audioRef.current = null;
    }
  };

  const handleAccept = async () => {
    stopRingtone();
    setIsProcessing(true);

    try {
      await apiClient.post('/calls/respond', {
        callId,
        response: 'accept',
      });

      // Call the callback
      onCallAccepted?.(callId);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to accept call';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
      // Always close the dialog
      onOpenChange(false);
    }
  };

  const handleReject = async () => {
    stopRingtone();
    setIsProcessing(true);

    try {
      await apiClient.post('/calls/respond', {
        callId,
        response: 'reject',
      });

      // Call the callback
      onCallRejected?.();
    } catch (err) {
      console.error('Failed to reject call:', err);
      // If the call is already ended, just show info
      if (err?.response?.status === 400 || err?.response?.status === 404) {
        toast.info('Call already ended');
      }
    } finally {
      setIsProcessing(false);
      // Always close the dialog, even if API call fails
      onOpenChange(false);
    }
  };

  const handleMissed = () => {
    stopRingtone();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !isProcessing && onOpenChange(newOpen)}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          Incoming {callType} call from {callerName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {callerName} is calling you. Accept or reject the call.
        </DialogDescription>
        <div className="flex flex-col items-center gap-6 py-8">
          {/* Caller Avatar with pulse animation */}
          <div className="relative">
            <Avatar className="h-32 w-32 ring-4 ring-primary/20">
              <AvatarImage src={getAvatarUrl(callerAvatar)} alt={callerName} />
              <AvatarFallback className="text-3xl">
                {callerName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-20" />
          </div>

          {/* Caller Name */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold">{callerName}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {callType === 'video' ? (
                <Video className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Phone className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-muted-foreground">
                Incoming {callType} call...
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="text-sm text-muted-foreground">
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-8">
            {/* Reject Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full h-16 w-16"
                onClick={handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <PhoneOff className="h-6 w-6" />
                ) : (
                  <X className="h-6 w-6" />
                )}
              </Button>
              <span className="text-xs text-muted-foreground">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="default"
                size="lg"
                className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
                disabled={isProcessing}
              >
                {callType === 'video' ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </Button>
              <span className="text-xs text-muted-foreground">Accept</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
