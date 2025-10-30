import React from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff, Settings, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CallControlsProps {
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onEndCall: () => void
  disabled?: boolean
  showParticipants?: boolean
  participantCount?: number
  onShowParticipants?: () => void
}

export const CallControls: React.FC<CallControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  disabled = false,
  showParticipants = false,
  participantCount = 1,
  onShowParticipants
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-2 p-4">
        {/* Audio Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              className="rounded-full w-14 h-14 p-0"
              onClick={onToggleAudio}
              disabled={disabled}
              aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {isAudioEnabled ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
          </TooltipContent>
        </Tooltip>

        {/* Video Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isVideoEnabled ? "default" : "secondary"}
              size="lg"
              className="rounded-full w-14 h-14 p-0"
              onClick={onToggleVideo}
              disabled={disabled}
              aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          </TooltipContent>
        </Tooltip>

        {/* Screen Share Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="lg"
              className={`rounded-full w-14 h-14 p-0 ${isScreenSharing ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={onToggleScreenShare}
              disabled={disabled}
              aria-label={isScreenSharing ? "Stop screen share" : "Share screen"}
            >
              {isScreenSharing ? (
                <MonitorOff className="w-6 h-6" />
              ) : (
                <Monitor className="w-6 h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenSharing ? "Stop screen share" : "Share screen"}
          </TooltipContent>
        </Tooltip>

        {/* Participants (for group calls) */}
        {showParticipants && onShowParticipants && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full w-14 h-14 p-0 relative"
                onClick={onShowParticipants}
                disabled={disabled}
                aria-label="Show participants"
              >
                <Users className="w-6 h-6" />
                {participantCount > 1 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {participantCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Show participants ({participantCount})
            </TooltipContent>
          </Tooltip>
        )}

        {/* Settings (placeholder for future features) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full w-14 h-14 p-0"
              disabled={disabled}
              aria-label="Call settings"
            >
              <Settings className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Call settings
          </TooltipContent>
        </Tooltip>

        {/* End Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16 p-0 ml-4"
              onClick={onEndCall}
              disabled={disabled}
              aria-label="End call"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            End call
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}