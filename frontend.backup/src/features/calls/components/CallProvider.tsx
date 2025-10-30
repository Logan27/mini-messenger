import React, { createContext, useContext, useEffect, useState } from 'react'
import { useWebSocketCallIntegration } from '@/hooks/useWebSocketCallIntegration'
import { useCallStore } from '@/app/stores/callStore'
import { callPermissions } from '@/features/calls/lib/callPermissions'
import { IncomingCallModal } from './IncomingCallModal'
import { ActiveCall } from './ActiveCall'
import { CallHistory } from '@/pages/CallHistory'
import type { Call, CallType, CallError } from '@/shared/lib/types'

interface CallContextValue {
  // State
  hasActiveCall: boolean
  hasIncomingCall: boolean
  isCallLoading: boolean
  callError: string | null

  // Actions
  initiateCall: (targetUserId: string, callType: CallType, conversationId?: string) => Promise<void>
  acceptCall: (callType: CallType) => Promise<void>
  declineCall: () => void
  endCall: () => void
  toggleAudio: () => void
  toggleVideo: () => void
  toggleScreenShare: () => Promise<void>
  callAgain: (targetUserId: string, callType: CallType) => void

  // Utilities
  showCallHistory: () => void
  hideCallHistory: () => void
  isCallHistoryVisible: boolean
}

const CallContext = createContext<CallContextValue | null>(null)

export const useCall = (): CallContextValue => {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}

interface CallProviderProps {
  children: React.ReactNode
}

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const [isCallHistoryVisible, setIsCallHistoryVisible] = useState(false)
  const [hasValidatedPermissions, setHasValidatedPermissions] = useState(false)

  const callStore = useCallStore()
  const {
    callState,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    callAgain,
    isReady,
    hasActiveCall,
    hasIncomingCall
  } = useWebSocketCallIntegration()

  // Validate permissions on mount
  useEffect(() => {
    const validatePermissions = async () => {
      try {
        const validation = await callPermissions.validateCallRequirements()
        if (!validation.valid) {
          console.warn('Call requirements not met:', validation.errors)
          // Don't block the app, just log warnings
        }
      } catch (error) {
        console.error('Failed to validate call permissions:', error)
      } finally {
        setHasValidatedPermissions(true)
      }
    }

    validatePermissions()
  }, [])

  // Show notification for incoming calls
  useEffect(() => {
    if (hasIncomingCall && callState.incomingCall && hasValidatedPermissions) {
      callPermissions.showIncomingCallNotification({
        initiator: callState.incomingCall.initiator,
        type: callState.incomingCall.type
      })
    }
  }, [hasIncomingCall, callState.incomingCall, hasValidatedPermissions])

  // Handle call errors
  useEffect(() => {
    if (callState.error) {
      console.error('Call error:', callState.error)
      // You could show a toast notification here
    }
  }, [callState.error])

  const handleInitiateCall = async (targetUserId: string, callType: CallType, conversationId?: string) => {
    try {
      callStore.setError(null)
      await initiateCall(targetUserId, callType, conversationId)
    } catch (error) {
      const callError = error as CallError
      callStore.setError(callError.message)
      throw error
    }
  }

  const handleAcceptCall = async (callType: CallType) => {
    try {
      callStore.setError(null)
      await acceptCall(callType)
    } catch (error) {
      const callError = error as CallError
      callStore.setError(callError.message)
      throw error
    }
  }

  const handleDeclineCall = () => {
    declineCall()
  }

  const handleEndCall = () => {
    endCall()
  }

  const handleToggleAudio = () => {
    toggleAudio()
  }

  const handleToggleVideo = () => {
    toggleVideo()
  }

  const handleToggleScreenShare = async () => {
    try {
      await toggleScreenShare()
    } catch (error) {
      const callError = error as CallError
      callStore.setError(callError.message)
    }
  }

  const handleCallAgain = (targetUserId: string, callType: CallType) => {
    callAgain(targetUserId, callType)
  }

  const showCallHistory = () => {
    setIsCallHistoryVisible(true)
  }

  const hideCallHistory = () => {
    setIsCallHistoryVisible(false)
  }

  const contextValue: CallContextValue = {
    // State
    hasActiveCall,
    hasIncomingCall,
    isCallLoading: callState.isLoading,
    callError: callState.error,

    // Actions
    initiateCall: handleInitiateCall,
    acceptCall: handleAcceptCall,
    declineCall: handleDeclineCall,
    endCall: handleEndCall,
    toggleAudio: handleToggleAudio,
    toggleVideo: handleToggleVideo,
    toggleScreenShare: handleToggleScreenShare,
    callAgain: handleCallAgain,

    // Utilities
    showCallHistory,
    hideCallHistory,
    isCallHistoryVisible
  }

  return (
    <CallContext.Provider value={contextValue}>
      {children}

      {/* Incoming Call Modal */}
      {hasIncomingCall && callState.incomingCall && (
        <IncomingCallModal
          call={callState.incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          isVisible={callState.isIncomingCallModalOpen}
        />
      )}

      {/* Active Call Interface */}
      {hasActiveCall && callState.currentCall && callState.localStream && (
        <ActiveCall
          call={callState.currentCall}
          localStream={callState.localStream}
          remoteStreams={callState.remoteStreams}
          onEndCall={handleEndCall}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          isAudioEnabled={callState.isAudioEnabled}
          isVideoEnabled={callState.isVideoEnabled}
          isScreenSharing={callState.isScreenSharing}
          qualityWarning={callState.error}
        />
      )}

      {/* Call History Page */}
      {isCallHistoryVisible && (
        <div className="fixed inset-0 z-30 bg-background">
          <CallHistory
            callHistory={callState.callHistory}
            onCallAgain={handleCallAgain}
            isLoading={callState.isLoading}
          />
          <button
            onClick={hideCallHistory}
            className="fixed top-4 right-4 z-40 bg-background border rounded-md px-4 py-2 shadow-lg hover:bg-muted transition-colors"
          >
            Close History
          </button>
        </div>
      )}
    </CallContext.Provider>
  )
}