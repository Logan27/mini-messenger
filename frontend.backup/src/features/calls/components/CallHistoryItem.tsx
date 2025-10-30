import React from 'react'
import { Phone, PhoneOff, Video, Clock, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CallHistoryItem as CallHistoryItemType, CallType } from '@/shared/lib/types'

interface CallHistoryItemProps {
  item: CallHistoryItemType
  onCallAgain: (userId: string, callType: CallType) => void
  onViewDetails?: (callId: string) => void
}

export const CallHistoryItem: React.FC<CallHistoryItemProps> = ({
  item,
  onCallAgain,
  onViewDetails
}) => {
  const { call, participant, isMissed, isIncoming, canCallAgain } = item

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00'

    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getCallIcon = () => {
    if (isMissed) {
      return <PhoneOff className="w-4 h-4 text-destructive" />
    }

    return call.type === 'video' ? (
      <Video className="w-4 h-4 text-primary" />
    ) : (
      <Phone className="w-4 h-4 text-green-500" />
    )
  }

  const getCallStatusBadge = () => {
    if (isMissed) {
      return <Badge variant="destructive">Missed</Badge>
    }

    if (isIncoming) {
      return <Badge variant="secondary">Incoming</Badge>
    }

    return <Badge variant="outline">Outgoing</Badge>
  }

  const getCallTypeText = () => {
    if (call.type === 'video') {
      return call.isGroupCall ? 'Group Video' : 'Video Call'
    }
    return call.isGroupCall ? 'Group Audio' : 'Audio Call'
  }

  return (
    <Card className="w-full hover:bg-muted/50 transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Participant Info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {participant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Online status indicator */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                participant.isOnline ? 'bg-green-500' : 'bg-muted-foreground'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">
                  {participant.name}
                </h3>
                {getCallStatusBadge()}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  {getCallIcon()}
                  <span>{getCallTypeText()}</span>
                </div>

                {call.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(call.duration)}</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(call.createdAt)}</span>
                </div>
              </div>

              {call.metadata?.topic && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {call.metadata.topic}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canCallAgain && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCallAgain(participant.id, 'audio')}
                  className="h-8 px-3"
                >
                  <Phone className="w-3 h-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCallAgain(participant.id, 'video')}
                  className="h-8 px-3"
                >
                  <Video className="w-3 h-3" />
                </Button>
              </div>
            )}

            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(call.id)}
                className="h-8 px-3"
              >
                Details
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Details (Optional) */}
        {call.endedAt && call.startedAt && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>
                Started: {formatDate(call.startedAt)}
              </span>
              <span>
                Ended: {formatDate(call.endedAt)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}