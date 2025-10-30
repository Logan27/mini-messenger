import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { webrtcService } from '@/shared/services/webrtcService'
import {
  Call,
  CallState,
  CallSettings,
  WebRTCSignal,
  CallError,
  User,
  CallType
} from '@/shared/lib/types'
import type { NetworkQuality } from '@/shared/services/webrtcService'

interface UseCallManagerOptions {
  user: User | null
  onCallUpdate?: (call: Call) => void
  onError?: (error: CallError) => void
}

export const useCallManager = ({ user, onCallUpdate, onError }: UseCallManagerOptions) => {
  const { sendMessage, isConnected } = useWebSocket()
  const [callState, setCallState] = useState<CallState>({
    currentCall: null,
    incomingCall: null,
    callHistory: [],
    isLoading: false,
    error: null,
    isIncomingCallModalOpen: false,
    localStream: null,
    remoteStreams: new Map(),
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    availableDevices: {
      audioInputs: [],
      videoInputs: [],
      audioOutputs: []
    }
  })

  const [settings, setSettings] = useState<CallSettings>({
    enableVideoByDefault: true,
    enableAudioByDefault: true,
    autoAcceptCalls: false,
    ringtoneEnabled: true,
    vibrationEnabled: true,
    callTimeout: 30,
    maxCallDuration: 120,
    enableScreenShare: true,
    enableRecording: false
  })

  const callTimeoutRef = useRef<NodeJS.Timeout>()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Initialize media devices on mount
  useEffect(() => {
    initializeDevices()

    return () => {
      cleanup()
    }
  }, [])

  // WebSocket reconnection handling
  useEffect(() => {
    if (!user || !isConnected) return

    const handleWebSocketReconnect = () => {
      console.log('🔄 WEBSOCKET_RECONNECT: Attempting to recover active calls')

      // Check if we have an active call that needs reconnection
      if (callState.currentCall && callState.currentCall.status === 'connected') {
        console.log('📞 RECOVERING_CALL: Found active call, attempting reconnection:', callState.currentCall.id)

        // Attempt to reconnect to the call
        fetch(`/api/calls/reconnect/${callState.currentCall.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
        .then(response => response.json())
        .then(data => {
          if (data.message === 'Reconnected to call successfully') {
            console.log('✅ CALL_RECONNECTED: Successfully reconnected to call')
            setCallState(prev => ({
              ...prev,
              error: null
            }))
          } else {
            console.error('❌ CALL_RECONNECT_FAILED: Reconnection failed:', data.message)
            setCallState(prev => ({
              ...prev,
              error: 'Failed to reconnect to call'
            }))
          }
        })
        .catch(error => {
          console.error('❌ CALL_RECONNECT_ERROR: Error during reconnection:', error)
          setCallState(prev => ({
            ...prev,
            error: 'Network error during call reconnection'
          }))
        })
      }
    }

    // Listen for WebSocket reconnection events
    window.addEventListener('websocket:reconnected', handleWebSocketReconnect)

    return () => {
      window.removeEventListener('websocket:reconnected', handleWebSocketReconnect)
    }
  }, [user, isConnected, callState.currentCall])

  // Handle WebSocket messages for call signaling
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data)

      if (message.type?.startsWith('call_')) {
        handleCallSignaling(message)
      }
    }

    if (isConnected) {
      window.addEventListener('message', handleWebSocketMessage)
    }

    return () => {
      window.removeEventListener('message', handleWebSocketMessage)
    }
  }, [isConnected])

  // Handle WebRTC events
  useEffect(() => {
    const handleRemoteStream = (event: CustomEvent) => {
      const { userId, stream } = event.detail
      setCallState(prev => ({
        ...prev,
        remoteStreams: new Map(prev.remoteStreams.set(userId, stream))
      }))
    }

    const handleDataChannelMessage = (event: CustomEvent) => {
      const { userId, message } = event.detail
      handleCallControlMessage(userId, message)
    }

    const handleQualityUpdate = (event: CustomEvent) => {
      const { userId, quality }: { userId: string; quality: NetworkQuality } = event.detail
      setCallState(prev => {
        const updatedCall = prev.currentCall ? {
          ...prev.currentCall,
          participants: prev.currentCall.participants.map(participant => {
            if (participant.userId === userId) {
              return {
                ...participant,
                connectionQuality: quality.quality === 'good' ? 'excellent' :
                                 quality.quality === 'fair' ? 'good' : 'poor'
              }
            }
            return participant
          })
        } : null

        return {
          ...prev,
          currentCall: updatedCall
        }
      })
    }

    const handleQualityWarning = (event: CustomEvent) => {
      const { type, message, metrics } = event.detail
      // Update error state with quality warning
      if (type === 'degradation') {
        setCallState(prev => ({
          ...prev,
          error: message
        }))
      }
      // You could also emit this to parent component if needed
      onError?.({
        code: 'QUALITY_WARNING',
        message,
        details: metrics
      })
    }

    window.addEventListener('webrtc:remote-stream', handleRemoteStream as EventListener)
    window.addEventListener('webrtc:data-channel-message', handleDataChannelMessage as EventListener)
    window.addEventListener('webrtc:quality-update', handleQualityUpdate as EventListener)
    window.addEventListener('webrtc:quality-warning', handleQualityWarning as EventListener)

    return () => {
      window.removeEventListener('webrtc:remote-stream', handleRemoteStream as EventListener)
      window.removeEventListener('webrtc:data-channel-message', handleDataChannelMessage as EventListener)
      window.removeEventListener('webrtc:quality-update', handleQualityUpdate as EventListener)
      window.removeEventListener('webrtc:quality-warning', handleQualityWarning as EventListener)
    }
  }, [onError])

  const initializeDevices = async () => {
    try {
      const devices = await webrtcService.getAvailableDevices()
      setCallState(prev => ({
        ...prev,
        availableDevices: devices
      }))

      // Set default devices
      if (devices.audioInputs.length > 0) {
        setSettings(prev => ({
          ...prev,
          preferredAudioDevice: devices.audioInputs[0].deviceId
        }))
      }

      if (devices.videoInputs.length > 0) {
        setSettings(prev => ({
          ...prev,
          preferredVideoDevice: devices.videoInputs[0].deviceId
        }))
      }
    } catch (error) {
      console.error('Failed to initialize devices:', error)
    }
  }

  const handleCallSignaling = async (message: any) => {
    console.log('📡 CALL_SIGNALING: Received message:', message.type, message);

    switch (message.type) {
      case 'call_initiated':
        console.log('📞 CALL_SIGNALING: Handling incoming call');
        handleIncomingCall(message.call)
        break
      case 'call_accepted':
        console.log('✅ CALL_SIGNALING: Call accepted');
        handleCallAccepted(message.call)
        break
      case 'call_declined':
        console.log('❌ CALL_SIGNALING: Call declined');
        handleCallDeclined(message.call)
        break
      case 'call_ended':
        console.log('🏁 CALL_SIGNALING: Call ended');
        handleCallEnded(message.call)
        break
      case 'call.missed':
        console.log('⏰ CALL_SIGNALING: Call missed');
        handleCallEnded(message.call)
        break
      case 'call.reconnected':
        console.log('🔄 CALL_SIGNALING: Call reconnection notification');
        // Handle reconnection confirmation from other participant
        if (message.reconnectedUserId && message.callId === callState.currentCall?.id) {
          console.log(`📞 CALL_RECONNECTED: Participant ${message.reconnectedUserId} reconnected`);
          // Update UI to show reconnection status
          setCallState(prev => ({
            ...prev,
            error: null // Clear any reconnection errors
          }));
        }
        break
      case 'webrtc_offer':
        console.log('🔄 CALL_SIGNALING: Handling WebRTC offer');
        await handleWebRTCOffer(message)
        break
      case 'webrtc_answer':
        console.log('🔄 CALL_SIGNALING: Handling WebRTC answer');
        await handleWebRTCAnswer(message)
        break
      case 'webrtc_ice_candidate':
        console.log('🔄 CALL_SIGNALING: Handling ICE candidate');
        await handleWebRTCICECandidate(message)
        break
      default:
        console.warn('⚠️ CALL_SIGNALING: Unknown message type:', message.type);
    }
  }

  const handleIncomingCall = (call: Call) => {
    setCallState(prev => ({
      ...prev,
      incomingCall: call,
      isIncomingCallModalOpen: true
    }))

    // Auto-accept if enabled
    if (settings.autoAcceptCalls) {
      acceptCall(call.type)
    }
  }

  const handleCallAccepted = (call: Call) => {
    setCallState(prev => ({
      ...prev,
      currentCall: { ...call, status: 'connected', startedAt: new Date().toISOString() },
      incomingCall: null,
      isIncomingCallModalOpen: false
    }))

    onCallUpdate?.(call)
  }

  const handleCallDeclined = (call: Call) => {
    setCallState(prev => ({
      ...prev,
      incomingCall: null,
      isIncomingCallModalOpen: false
    }))
  }

  const handleCallEnded = (call: Call) => {
    cleanupCall()

    // Add to call history
    setCallState(prev => ({
      ...prev,
      callHistory: [{
        call: { ...call, status: 'ended', endedAt: new Date().toISOString() },
        participant: call.initiator,
        isMissed: false,
        isIncoming: call.initiatorId !== user?.id,
        canCallAgain: true
      }, ...prev.callHistory]
    }))
  }

  const handleWebRTCOffer = async (message: any) => {
    try {
      const { fromUserId, offer, callId } = message

      console.log('🔄 WEBRTC_OFFER: Processing offer from', fromUserId);

      // Validate message structure
      if (!fromUserId || !offer || !callId) {
        console.error('❌ WEBRTC_OFFER: Invalid offer message structure:', message);
        onError?.({
          code: 'INVALID_OFFER',
          message: 'Invalid WebRTC offer received'
        });
        return;
      }

      // Create peer connection for the caller
      await webrtcService.createPeerConnection(fromUserId, false)

      // Start quality monitoring for incoming call
      webrtcService.startQualityMonitoring(fromUserId)

      // Handle the offer
      const answer = await webrtcService.createAnswer(fromUserId, offer)

      // Send answer back via WebSocket
      sendMessage({
        type: 'webrtc_answer',
        callId,
        toUserId: fromUserId,
        answer
      })

      console.log('✅ WEBRTC_OFFER: Successfully processed offer and sent answer');
    } catch (error) {
      console.error('❌ WEBRTC_OFFER: Failed to handle WebRTC offer:', error);
      onError?.({
        code: 'OFFER_PROCESSING_FAILED',
        message: 'Failed to process WebRTC offer',
        details: error
      });
    }
  }

  const handleWebRTCAnswer = async (message: any) => {
    try {
      const { fromUserId, answer } = message

      console.log('🔄 WEBRTC_ANSWER: Processing answer from', fromUserId);

      // Validate message structure
      if (!fromUserId || !answer) {
        console.error('❌ WEBRTC_ANSWER: Invalid answer message structure:', message);
        onError?.({
          code: 'INVALID_ANSWER',
          message: 'Invalid WebRTC answer received'
        });
        return;
      }

      await webrtcService.handleAnswer(fromUserId, answer)
      console.log('✅ WEBRTC_ANSWER: Successfully processed answer');
    } catch (error) {
      console.error('❌ WEBRTC_ANSWER: Failed to handle WebRTC answer:', error);
      onError?.({
        code: 'ANSWER_PROCESSING_FAILED',
        message: 'Failed to process WebRTC answer',
        details: error
      });
    }
  }

  const handleWebRTCICECandidate = async (message: any) => {
    try {
      const { fromUserId, candidate } = message

      console.log('🔄 WEBRTC_ICE: Processing ICE candidate from', fromUserId);

      // Validate message structure
      if (!fromUserId || !candidate) {
        console.error('❌ WEBRTC_ICE: Invalid ICE candidate message structure:', message);
        onError?.({
          code: 'INVALID_ICE_CANDIDATE',
          message: 'Invalid WebRTC ICE candidate received'
        });
        return;
      }

      await webrtcService.handleICECandidate(fromUserId, candidate)
      console.log('✅ WEBRTC_ICE: Successfully processed ICE candidate');
    } catch (error) {
      console.error('❌ WEBRTC_ICE: Failed to handle ICE candidate:', error);
      onError?.({
        code: 'ICE_PROCESSING_FAILED',
        message: 'Failed to process WebRTC ICE candidate',
        details: error
      });
    }
  }

  const handleCallControlMessage = (userId: string, message: any) => {
    // Handle call control messages via data channel
    switch (message.type) {
      case 'mute':
        // Handle remote mute
        break
      case 'unmute':
        // Handle remote unmute
        break
      case 'video_on':
        // Handle remote video on
        break
      case 'video_off':
        // Handle remote video off
        break
    }
  }

  const initiateCall = useCallback(async (targetUserId: string, callType: CallType, conversationId?: string) => {
    console.log(`📞 INITIATE_CALL: Starting ${callType} call to ${targetUserId}`);

    if (!user || !isConnected) {
      console.error('❌ INITIATE_CALL: User not authenticated or WebSocket not connected');
      onError?.({
        code: 'CONNECTION_FAILED',
        message: 'User not authenticated or WebSocket not connected'
      })
      return
    }

    try {
      setCallState(prev => ({ ...prev, isLoading: true, error: null }))
      console.log('🔄 INITIATE_CALL: Set loading state');

      // Initialize media stream
      const constraints = {
        audio: settings.enableAudioByDefault,
        video: callType === 'video' ? settings.enableVideoByDefault : false
      }

      console.log('🎤 INITIATE_CALL: Initializing media stream with constraints:', constraints);
      const localStream = await webrtcService.initializeMediaStream(constraints)
      setCallState(prev => ({ ...prev, localStream }))
      console.log('✅ INITIATE_CALL: Media stream initialized');

      // Create call object
      const call: Call = {
        id: `call_${Date.now()}_${user.id}_${targetUserId}`,
        type: callType,
        status: 'initiating',
        initiatorId: user.id,
        initiator: user,
        participants: [
          {
            id: `participant_${user.id}`,
            userId: user.id,
            user: user,
            isMuted: !settings.enableAudioByDefault,
            isVideoEnabled: callType === 'video' ? settings.enableVideoByDefault : false,
            isScreenSharing: false,
            joinedAt: new Date().toISOString(),
            connectionQuality: 'disconnected'
          }
        ],
        maxParticipants: 2,
        isGroupCall: false,
        conversationId
      }

      console.log('🔗 INITIATE_CALL: Creating peer connection');
      // Create peer connection
      await webrtcService.createPeerConnection(targetUserId, true)

      console.log('📊 INITIATE_CALL: Starting quality monitoring');
      // Start quality monitoring
      webrtcService.startQualityMonitoring(targetUserId)

      console.log('📤 INITIATE_CALL: Creating offer');
      // Create and send offer
      const offer = await webrtcService.createOffer(targetUserId)

      console.log('📡 INITIATE_CALL: Sending WebSocket message');
      // Send call initiation via WebSocket
      sendMessage({
        type: 'call_initiate',
        call,
        toUserId: targetUserId,
        offer
      })

      setCallState(prev => ({
        ...prev,
        currentCall: call,
        isLoading: false
      }))

      console.log('✅ INITIATE_CALL: Call initiated successfully');

    } catch (error) {
      console.error('❌ INITIATE_CALL: Error initiating call:', error);
      setCallState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as CallError).message
      }))
      onError?.(error as CallError)
    }
  }, [user, isConnected, settings, sendMessage, onError])

  const acceptCall = useCallback(async (callType: CallType) => {
    console.log(`✅ ACCEPT_CALL: Accepting ${callType} call`);

    if (!callState.incomingCall || !user) {
      console.error('❌ ACCEPT_CALL: No incoming call or user not authenticated');
      return;
    }

    try {
      setCallState(prev => ({ ...prev, isLoading: true, error: null }))
      console.log('🔄 ACCEPT_CALL: Set loading state');

      // Initialize media stream
      const constraints = {
        audio: settings.enableAudioByDefault,
        video: callType === 'video' ? settings.enableVideoByDefault : false
      }

      console.log('🎤 ACCEPT_CALL: Initializing media stream with constraints:', constraints);
      const localStream = await webrtcService.initializeMediaStream(constraints)
      setCallState(prev => ({ ...prev, localStream }))
      console.log('✅ ACCEPT_CALL: Media stream initialized');

      console.log('📡 ACCEPT_CALL: Sending WebSocket acceptance message');
      // Send call acceptance via WebSocket
      sendMessage({
        type: 'call_accept',
        callId: callState.incomingCall.id,
        toUserId: callState.incomingCall.initiatorId
      })

      console.log('🔗 ACCEPT_CALL: Updating call state');
      setCallState(prev => ({
        ...prev,
        currentCall: {
          ...prev.incomingCall!,
          status: 'connecting',
          participants: [
            ...prev.incomingCall!.participants,
            {
              id: `participant_${user.id}`,
              userId: user.id,
              user: user,
              isMuted: !settings.enableAudioByDefault,
              isVideoEnabled: callType === 'video' ? settings.enableVideoByDefault : false,
              isScreenSharing: false,
              joinedAt: new Date().toISOString(),
              connectionQuality: 'disconnected'
            }
          ]
        },
        incomingCall: null,
        isIncomingCallModalOpen: false,
        isLoading: false
      }))

      console.log('✅ ACCEPT_CALL: Call accepted successfully');

    } catch (error) {
      console.error('❌ ACCEPT_CALL: Error accepting call:', error);
      setCallState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as CallError).message
      }))
      onError?.(error as CallError)
    }
  }, [callState.incomingCall, user, settings, sendMessage, onError])

  const declineCall = useCallback(() => {
    if (!callState.incomingCall) return

    sendMessage({
      type: 'call_decline',
      callId: callState.incomingCall.id,
      toUserId: callState.incomingCall.initiatorId
    })

    setCallState(prev => ({
      ...prev,
      incomingCall: null,
      isIncomingCallModalOpen: false
    }))
  }, [callState.incomingCall, sendMessage])

  const endCall = useCallback(() => {
    if (!callState.currentCall) return

    sendMessage({
      type: 'call_end',
      callId: callState.currentCall.id,
      toUserId: callState.currentCall.initiatorId
    })

    cleanupCall()
  }, [callState.currentCall, sendMessage])

  const cleanupCall = useCallback(() => {
    // Clear call timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
    }

    // Stop media recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Cleanup WebRTC
    webrtcService.cleanup()

    // Reset state
    setCallState(prev => ({
      ...prev,
      currentCall: null,
      localStream: null,
      remoteStreams: new Map(),
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false
    }))
  }, [])

  const toggleAudio = useCallback(() => {
    const newState = !callState.isAudioEnabled
    setCallState(prev => ({ ...prev, isAudioEnabled: newState }))
    webrtcService.toggleAudio(newState)

    // Send control message to remote participants
    if (callState.currentCall) {
      sendMessage({
        type: 'call_control',
        callId: callState.currentCall.id,
        control: newState ? 'unmute' : 'mute'
      })
    }
  }, [callState.isAudioEnabled, callState.currentCall, sendMessage])

  const toggleVideo = useCallback(() => {
    const newState = !callState.isVideoEnabled
    setCallState(prev => ({ ...prev, isVideoEnabled: newState }))
    webrtcService.toggleVideo(newState)

    // Send control message to remote participants
    if (callState.currentCall) {
      sendMessage({
        type: 'call_control',
        callId: callState.currentCall.id,
        control: newState ? 'video_on' : 'video_off'
      })
    }
  }, [callState.isVideoEnabled, callState.currentCall, sendMessage])

  const toggleScreenShare = useCallback(async () => {
    try {
      if (callState.isScreenSharing) {
        await webrtcService.stopScreenShare()
        setCallState(prev => ({ ...prev, isScreenSharing: false }))
      } else {
        await webrtcService.startScreenShare()
        setCallState(prev => ({ ...prev, isScreenSharing: true }))
      }
    } catch (error) {
      onError?.(error as CallError)
    }
  }, [callState.isScreenSharing, onError])

  const changeAudioDevice = useCallback(async (deviceId: string) => {
    try {
      await webrtcService.changeAudioInput(deviceId)
      setSettings(prev => ({ ...prev, preferredAudioDevice: deviceId }))
    } catch (error) {
      onError?.(error as CallError)
    }
  }, [onError])

  const changeVideoDevice = useCallback(async (deviceId: string) => {
    try {
      await webrtcService.changeVideoInput(deviceId)
      setSettings(prev => ({ ...prev, preferredVideoDevice: deviceId }))
    } catch (error) {
      onError?.(error as CallError)
    }
  }, [onError])

  const callAgain = useCallback((targetUserId: string, callType: CallType) => {
    initiateCall(targetUserId, callType)
  }, [initiateCall])

  const updateSettings = useCallback((newSettings: Partial<CallSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  return {
    // State
    callState,
    settings,

    // Actions
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    changeAudioDevice,
    changeVideoDevice,
    callAgain,
    updateSettings,

    // Utilities
    isReady: !!user && isConnected && !callState.isLoading,
    hasActiveCall: !!callState.currentCall,
    hasIncomingCall: !!callState.incomingCall,
    canInitiateCall: !!user && isConnected && !callState.currentCall
  }
}