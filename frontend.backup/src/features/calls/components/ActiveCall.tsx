import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Users, Minimize2, Maximize2, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Call, CallParticipant } from '@/shared/lib/types'
import { CallControls } from './CallControls'
import type { NetworkQuality } from '@/shared/services/webrtcService'

interface ActiveCallProps {
  call: Call
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  onEndCall: () => void
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  onMinimize?: () => void
  onMaximize?: () => void
  isMinimized?: boolean
  qualityWarning?: string | null
}

export const ActiveCall: React.FC<ActiveCallProps> = ({
  call,
  localStream,
  remoteStreams,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onMinimize,
  onMaximize,
  isMinimized = false,
  qualityWarning
}) => {
  const [callDuration, setCallDuration] = useState(0)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [networkQuality, setNetworkQuality] = useState<Map<string, NetworkQuality>>(new Map())
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  // Call duration timer
  useEffect(() => {
    if (call.status !== 'connected' || !call.startedAt) return

    const interval = setInterval(() => {
      const now = new Date()
      const started = new Date(call.startedAt!)
      setCallDuration(Math.floor((now.getTime() - started.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [call.status, call.startedAt])

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Set up remote video streams
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId)
      if (videoElement) {
        videoElement.srcObject = stream
      }
    })
  }, [remoteStreams])

  // Audio level monitoring for active speaker detection
  useEffect(() => {
    if (!localStream) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(localStream)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    microphone.connect(analyser)

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length

      if (average > 50) {
        setActiveSpeaker('local')
        setTimeout(() => setActiveSpeaker(null), 1000)
      }
    }

    const interval = setInterval(checkAudioLevel, 100)
    return () => {
      clearInterval(interval)
      audioContext.close()
    }
  }, [localStream])

  // Network quality monitoring
  useEffect(() => {
    const handleQualityUpdate = (event: CustomEvent) => {
      const { userId, quality } = event.detail
      setNetworkQuality(prev => new Map(prev.set(userId, quality)))
    }

    const handleQualityWarning = (event: CustomEvent) => {
      const { userId, type, message, metrics } = event.detail
      console.warn(`⚠️ NETWORK_QUALITY: ${type} for user ${userId}:`, message, metrics)
    }

    const handleQualityChanged = (event: CustomEvent) => {
      const { userId, newQuality, adjustments } = event.detail
      console.log(`🔄 NETWORK_QUALITY: Quality changed for user ${userId}:`, newQuality, adjustments)
    }

    window.addEventListener('webrtc:quality-update', handleQualityUpdate as EventListener)
    window.addEventListener('webrtc:quality-warning', handleQualityWarning as EventListener)
    window.addEventListener('webrtc:quality-changed', handleQualityChanged as EventListener)

    return () => {
      window.removeEventListener('webrtc:quality-update', handleQualityUpdate as EventListener)
      window.removeEventListener('webrtc:quality-warning', handleQualityWarning as EventListener)
      window.removeEventListener('webrtc:quality-changed', handleQualityChanged as EventListener)
    }
  }, [])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getConnectionQualityColor = (quality: CallParticipant['connectionQuality']): string => {
    switch (quality) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-yellow-500'
      case 'poor': return 'bg-red-500'
      case 'disconnected': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getConnectionQualityText = (quality: CallParticipant['connectionQuality']): string => {
    switch (quality) {
      case 'excellent': return 'Excellent'
      case 'good': return 'Good'
      case 'poor': return 'Poor'
      case 'disconnected': return 'Disconnected'
      default: return 'Unknown'
    }
  }

  const getNetworkQualityIcon = (quality: NetworkQuality['quality']) => {
    switch (quality) {
      case 'good': return <Wifi className="w-4 h-4" />
      case 'fair': return <Wifi className="w-4 h-4" />
      case 'poor': return <WifiOff className="w-4 h-4" />
      default: return <WifiOff className="w-4 h-4" />
    }
  }

  const getNetworkQualityColor = (quality: NetworkQuality['quality']): string => {
    switch (quality) {
      case 'good': return 'text-green-500'
      case 'fair': return 'text-yellow-500'
      case 'poor': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const formatNetworkMetrics = (quality: NetworkQuality) => {
    return {
      latency: `${quality.latency.toFixed(0)}ms`,
      packetLoss: `${quality.packetLoss.toFixed(1)}%`,
      jitter: `${quality.jitter.toFixed(1)}ms`,
      bitrate: quality.bitrate > 0 ? `${(quality.bitrate / 1000).toFixed(1)}kbps` : 'N/A'
    }
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-40 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={call.initiator.avatar} alt={call.initiator.name} />
                <AvatarFallback>{call.initiator.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{call.initiator.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(callDuration)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onMaximize}>
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={onEndCall}>
                <PhoneOff className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="fixed inset-0 z-40 bg-background">
      {/* Quality Warning Banner */}
      {qualityWarning && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-2">
          <div className="flex items-center gap-2 text-yellow-700 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{qualityWarning}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={call.initiator.avatar} alt={call.initiator.name} />
            <AvatarFallback>{call.initiator.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{call.initiator.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDuration(callDuration)}</span>
              <Badge variant="outline" className="capitalize">
                {call.type} Call
              </Badge>
              {call.isGroupCall && (
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  Group
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onMinimize && (
            <Button variant="ghost" size="sm" onClick={onMinimize}>
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={onEndCall}>
            <PhoneOff className="w-4 h-4 mr-2" />
            End Call
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-140px)]">
        {/* Remote Video (Primary) */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <video
              key={userId}
              ref={(el) => {
                if (el) remoteVideoRefs.current.set(userId, el)
              }}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${activeSpeaker === userId ? 'ring-2 ring-primary' : ''}`}
            />
          ))}

          {remoteStreams.size === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Avatar className="w-20 h-20 mx-auto">
                  <AvatarImage src={call.initiator.avatar} alt={call.initiator.name} />
                  <AvatarFallback className="text-xl">
                    {call.initiator.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{call.initiator.name}</p>
                  <p className="text-sm text-muted-foreground">Connecting...</p>
                </div>
              </div>
            </div>
          )}

          {/* Connection Quality Indicator */}
          {call.participants.map((participant) => (
            <div
              key={participant.id}
              className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${getConnectionQualityColor(participant.connectionQuality)}`}
            >
              {getConnectionQualityText(participant.connectionQuality)}
            </div>
          ))}

          {/* Network Quality Indicator */}
          {Array.from(networkQuality.entries()).map(([userId, quality]) => (
            <div
              key={`network-${userId}`}
              className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
            >
              <div className={getNetworkQualityColor(quality.quality)}>
                {getNetworkQualityIcon(quality.quality)}
              </div>
              <span>{quality.quality.toUpperCase()}</span>
            </div>
          ))}

          {/* Detailed Network Metrics (shown on hover) */}
          {Array.from(networkQuality.entries()).map(([userId, quality]) => (
            <div
              key={`metrics-${userId}`}
              className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="space-y-1">
                <div>Latency: {formatNetworkMetrics(quality).latency}</div>
                <div>Loss: {formatNetworkMetrics(quality).packetLoss}</div>
                <div>Jitter: {formatNetworkMetrics(quality).jitter}</div>
                <div>Bitrate: {formatNetworkMetrics(quality).bitrate}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Local Video (Secondary) */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  You
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local participant indicator */}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            You {!isAudioEnabled && '(Muted)'}
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t">
        <CallControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleAudio={onToggleAudio}
          onToggleVideo={onToggleVideo}
          onToggleScreenShare={onToggleScreenShare}
          onEndCall={onEndCall}
          disabled={call.status !== 'connected'}
        />
      </div>
    </div>
  )
}