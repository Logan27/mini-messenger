import { Phone, Video, PhoneMissed, PhoneOff, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CallMessageProps {
  callId: string;
  callType: 'voice' | 'video';
  callStatus: 'completed' | 'missed' | 'cancelled' | 'rejected' | 'ongoing';
  callDuration?: number; // in seconds
  timestamp: Date;
  isOwn: boolean;
  onCallBack?: () => void;
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function CallMessage({
  callId,
  callType,
  callStatus,
  callDuration,
  timestamp,
  isOwn,
  onCallBack,
}: CallMessageProps) {
  const getCallIcon = () => {
    if (callType === 'video') {
      return <Video className="h-4 w-4" />;
    }
    
    switch (callStatus) {
      case 'missed':
        return <PhoneMissed className="h-4 w-4 text-red-500" />;
      case 'cancelled':
      case 'rejected':
        return <PhoneOff className="h-4 w-4 text-orange-500" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  const getCallText = () => {
    const direction = isOwn ? 'Outgoing' : 'Incoming';
    const typeText = callType === 'video' ? 'video call' : 'call';
    
    switch (callStatus) {
      case 'completed':
        return callDuration ? `${direction} ${typeText} • ${formatDuration(callDuration)}` : `${direction} ${typeText}`;
      case 'missed':
        return isOwn ? `Cancelled ${typeText}` : `Missed ${typeText}`;
      case 'cancelled':
        return `Cancelled ${typeText}`;
      case 'rejected':
        return isOwn ? `${typeText} declined` : `Declined ${typeText}`;
      case 'ongoing':
        return `${direction} ${typeText} in progress`;
      default:
        return `${direction} ${typeText}`;
    }
  };

  const showCallBackButton = !isOwn && ['missed', 'cancelled', 'rejected'].includes(callStatus);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg max-w-xs my-2",
        isOwn 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted text-foreground mr-auto",
        (callStatus === 'missed' && !isOwn) && "border-2 border-red-500"
      )}
    >
      <div className="flex-shrink-0">
        {getCallIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{getCallText()}</p>
        <p className="text-xs opacity-70">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {showCallBackButton && onCallBack && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-primary/20"
          onClick={onCallBack}
          title="Call back"
        >
          {callType === 'video' ? (
            <Video className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
