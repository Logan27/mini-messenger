import React, { useEffect, useState } from 'react'
import { Phone, PhoneOff, Video, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Call, CallType } from '@/shared/lib/types'

interface IncomingCallModalProps {
  call: Call
  onAccept: (callType: CallType) => void
  onDecline: () => void
  isVisible: boolean
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
  isVisible
}) => {
  const [timeLeft, setTimeLeft] = useState(30) // 30 second timeout
  const [isRinging, setIsRinging] = useState(false)
  const [ringtoneEnabled, setRingtoneEnabled] = useState(true)

  // Auto-decline timer
  useEffect(() => {
    if (!isVisible || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onDecline()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, timeLeft, onDecline])

  // Ring animation and sound effect
  useEffect(() => {
    if (!isVisible) return

    const ringInterval = setInterval(() => {
      setIsRinging((prev) => !prev)
    }, 1000)

    return () => clearInterval(ringInterval)
  }, [isVisible])

  // Play ringtone (simulated)
  useEffect(() => {
    if (!isVisible || !ringtoneEnabled) return

    // In a real implementation, you would play an actual ringtone here
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5)

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 1)

    const interval = setInterval(() => {
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 1)
    }, 2000)

    return () => {
      clearInterval(interval)
      oscillator.stop()
    }
  }, [isVisible, ringtoneEnabled])

  if (!isVisible || !call) return null

  const initiator = call.initiator
  const callTypeText = call.type === 'video' ? 'Video' : 'Audio'
  const CallIcon = call.type === 'video' ? Video : Phone

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className={`w-full max-w-md mx-auto transition-all duration-300 ${
        isRinging ? 'scale-105 shadow-2xl' : 'scale-100'
      }`}>
        <CardContent className="p-8 text-center space-y-6">
          {/* Caller Avatar */}
          <div className="relative">
            <Avatar className="w-24 h-24 mx-auto border-4 border-primary">
              <AvatarImage src={initiator.avatar} alt={initiator.name} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initiator.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Pulsing ring animation */}
            <div className={`absolute inset-0 rounded-full border-4 border-primary/30 animate-ping ${
              isRinging ? 'animate-pulse' : ''
            }`} />
          </div>

          {/* Caller Information */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {initiator.name}
            </h2>
            <p className="text-muted-foreground">
              Incoming {callTypeText.toLowerCase()} call
            </p>
            {call.metadata?.topic && (
              <p className="text-sm text-muted-foreground">
                Topic: {call.metadata.topic}
              </p>
            )}
          </div>

          {/* Timer */}
          <div className="text-sm text-muted-foreground">
            Auto-decline in {timeLeft}s
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Decline Button */}
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16 p-0"
              onClick={onDecline}
              aria-label="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            {/* Accept Button */}
            <Button
              variant="default"
              size="lg"
              className="rounded-full w-16 h-16 p-0 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept(call.type)}
              aria-label={`Accept ${callTypeText.toLowerCase()} call`}
            >
              <CallIcon className="w-6 h-6" />
            </Button>
          </div>

          {/* Ringtone Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRingtoneEnabled(!ringtoneEnabled)}
            className="text-muted-foreground hover:text-foreground"
          >
            {ringtoneEnabled ? (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Mute Ringtone
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 mr-2" />
                Unmute Ringtone
              </>
            )}
          </Button>

          {/* Call Type Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CallIcon className="w-4 h-4" />
            <span>{callTypeText} Call</span>
            {call.isGroupCall && (
              <>
                <span>•</span>
                <span>Group Call</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}