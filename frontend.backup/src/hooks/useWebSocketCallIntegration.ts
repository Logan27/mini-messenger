import { useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import { useCallManager } from '@/features/calls/hooks/useCallManager'
import { useCallStore } from '@/app/stores/callStore'
import { useAuthStore } from '@/app/stores/authStore'
import type { Call, CallError } from '@/shared/lib/types'

export const useWebSocketCallIntegration = () => {
  const { user } = useAuthStore()
  const { isConnected, sendMessage } = useWebSocket()
  const callStore = useCallStore()

  const {
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    callAgain,
    callState
  } = useCallManager({
    user,
    onCallUpdate: (call: Call) => {
      callStore.setCurrentCall(call)
    },
    onError: (error: CallError) => {
      callStore.setError(error.message)
    }
  })

  // Handle incoming WebSocket call events
  useEffect(() => {
    if (!isConnected) return

    const handleCallInitiated = (data: any) => {
      const call = data.call as Call
      callStore.setIncomingCall(call)
      callStore.setIncomingCallModalOpen(true)
    }

    const handleCallAccepted = (data: any) => {
      const call = data.call as Call
      callStore.setCurrentCall({ ...call, status: 'connected', startedAt: new Date().toISOString() })
      callStore.setIncomingCall(null)
      callStore.setIncomingCallModalOpen(false)
    }

    const handleCallDeclined = (data: any) => {
      callStore.setIncomingCall(null)
      callStore.setIncomingCallModalOpen(false)
    }

    const handleCallEnded = (data: any) => {
      const call = data.call as Call

      // Add to call history
      if (call && user) {
        const historyItem = {
          call: { ...call, status: 'ended', endedAt: new Date().toISOString() },
          participant: call.initiator,
          isMissed: false,
          isIncoming: call.initiatorId !== user.id,
          canCallAgain: true
        }
        callStore.addCallToHistory(historyItem)
      }

      // Reset call state
      callStore.resetCallState()
    }

    const handleCallFailed = (data: any) => {
      callStore.setError(data.reason || 'Call failed')
      callStore.resetCallState()
    }

    // Subscribe to WebSocket events
    window.addEventListener('call_initiated', handleCallInitiated)
    window.addEventListener('call_accepted', handleCallAccepted)
    window.addEventListener('call_declined', handleCallDeclined)
    window.addEventListener('call_ended', handleCallEnded)
    window.addEventListener('call_failed', handleCallFailed)

    return () => {
      window.removeEventListener('call_initiated', handleCallInitiated)
      window.removeEventListener('call_accepted', handleCallAccepted)
      window.removeEventListener('call_declined', handleCallDeclined)
      window.removeEventListener('call_ended', handleCallEnded)
      window.removeEventListener('call_failed', handleCallFailed)
    }
  }, [isConnected, user, callStore])

  // Handle WebRTC signaling events
  useEffect(() => {
    if (!isConnected) return

    const handleWebRTCSignal = (data: any) => {
      // Forward WebRTC signals to the WebRTC service via the call manager
      // This would be handled by the useCallManager hook
    }

    window.addEventListener('webrtc_signal', handleWebRTCSignal)

    return () => {
      window.removeEventListener('webrtc_signal', handleWebRTCSignal)
    }
  }, [isConnected])

  // Enhanced call functions with WebSocket integration
  const initiateCallWithWebSocket = async (targetUserId: string, callType: 'audio' | 'video', conversationId?: string) => {
    try {
      callStore.setLoading(true)
      callStore.setError(null)

      await initiateCall(targetUserId, callType, conversationId)

      // The call manager will handle WebSocket signaling
    } catch (error) {
      callStore.setError((error as CallError).message)
      throw error
    } finally {
      callStore.setLoading(false)
    }
  }

  const acceptCallWithWebSocket = async (callType: 'audio' | 'video') => {
    try {
      callStore.setLoading(true)
      await acceptCall(callType)
    } catch (error) {
      callStore.setError((error as CallError).message)
      throw error
    } finally {
      callStore.setLoading(false)
    }
  }

  const declineCallWithWebSocket = () => {
    declineCall()
  }

  const endCallWithWebSocket = () => {
    endCall()
  }

  const toggleAudioWithWebSocket = () => {
    toggleAudio()

    // Send control message via WebSocket
    if (callState.currentCall) {
      sendMessage({
        type: 'call_control',
        callId: callState.currentCall.id,
        control: callState.isAudioEnabled ? 'mute' : 'unmute'
      })
    }
  }

  const toggleVideoWithWebSocket = () => {
    toggleVideo()

    // Send control message via WebSocket
    if (callState.currentCall) {
      sendMessage({
        type: 'call_control',
        callId: callState.currentCall.id,
        control: callState.isVideoEnabled ? 'video_off' : 'video_on'
      })
    }
  }

  const toggleScreenShareWithWebSocket = async () => {
    try {
      await toggleScreenShare()

      // Send control message via WebSocket
      if (callState.currentCall) {
        sendMessage({
          type: 'call_control',
          callId: callState.currentCall.id,
          control: callState.isScreenSharing ? 'screen_share_start' : 'screen_share_stop'
        })
      }
    } catch (error) {
      callStore.setError((error as CallError).message)
    }
  }

  const callAgainWithWebSocket = (targetUserId: string, callType: 'audio' | 'video') => {
    callAgain(targetUserId, callType)
  }

  return {
    // State
    callState: callStore,

    // Actions
    initiateCall: initiateCallWithWebSocket,
    acceptCall: acceptCallWithWebSocket,
    declineCall: declineCallWithWebSocket,
    endCall: endCallWithWebSocket,
    toggleAudio: toggleAudioWithWebSocket,
    toggleVideo: toggleVideoWithWebSocket,
    toggleScreenShare: toggleScreenShareWithWebSocket,
    callAgain: callAgainWithWebSocket,

    // Utilities
    isReady: !!user && isConnected && !callStore.isLoading,
    hasActiveCall: !!callStore.currentCall,
    hasIncomingCall: !!callStore.incomingCall,
    canInitiateCall: !!user && isConnected && !callStore.currentCall
  }
}