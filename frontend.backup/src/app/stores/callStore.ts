import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Call, CallState, CallSettings, CallHistoryItem, CallError } from '@/shared/lib/types'

interface CallStore extends CallState {
  // Settings actions
  updateSettings: (settings: Partial<CallSettings>) => void

  // Call actions
  setCurrentCall: (call: Call | null) => void
  setIncomingCall: (call: Call | null) => void
  setIncomingCallModalOpen: (isOpen: boolean) => void
  addCallToHistory: (callItem: CallHistoryItem) => void
  clearCallHistory: () => void

  // Media actions
  setLocalStream: (stream: MediaStream | null) => void
  setRemoteStreams: (streams: Map<string, MediaStream>) => void
  addRemoteStream: (userId: string, stream: MediaStream) => void
  removeRemoteStream: (userId: string) => void

  // Control actions
  setAudioEnabled: (enabled: boolean) => void
  setVideoEnabled: (enabled: boolean) => void
  setScreenSharing: (enabled: boolean) => void

  // Device actions
  setAvailableDevices: (devices: CallState['availableDevices']) => void
  setSelectedAudioDevice: (deviceId: string) => void
  setSelectedVideoDevice: (deviceId: string) => void

  // Error handling
  setError: (error: string | null) => void

  // Loading state
  setLoading: (loading: boolean) => void

  // Utility actions
  resetCallState: () => void
  getCallById: (callId: string) => Call | null
  getCallHistoryItem: (callId: string) => CallHistoryItem | null
}

const initialState: CallState = {
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
}

export const useCallStore = create<CallStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateSettings: (newSettings: Partial<CallSettings>) => {
        set(state => ({
          // Store settings in local storage via persist middleware
          // This is handled by the persist middleware automatically
        }))

        // Update the store with new settings (they'll be persisted)
        const currentState = get()
        const updatedSettings = { ...currentState, ...newSettings }
        Object.assign(currentState, updatedSettings)
      },

      setCurrentCall: (call: Call | null) => {
        set({ currentCall: call })
      },

      setIncomingCall: (call: Call | null) => {
        set({ incomingCall: call })
      },

      setIncomingCallModalOpen: (isOpen: boolean) => {
        set({ isIncomingCallModalOpen: isOpen })
      },

      addCallToHistory: (callItem: CallHistoryItem) => {
        set(state => ({
          callHistory: [callItem, ...state.callHistory]
        }))
      },

      clearCallHistory: () => {
        set({ callHistory: [] })
      },

      setLocalStream: (stream: MediaStream | null) => {
        set({ localStream: stream })
      },

      setRemoteStreams: (streams: Map<string, MediaStream>) => {
        set({ remoteStreams: streams })
      },

      addRemoteStream: (userId: string, stream: MediaStream) => {
        set(state => {
          const newStreams = new Map(state.remoteStreams)
          newStreams.set(userId, stream)
          return { remoteStreams: newStreams }
        })
      },

      removeRemoteStream: (userId: string) => {
        set(state => {
          const newStreams = new Map(state.remoteStreams)
          newStreams.delete(userId)
          return { remoteStreams: newStreams }
        })
      },

      setAudioEnabled: (enabled: boolean) => {
        set({ isAudioEnabled: enabled })
      },

      setVideoEnabled: (enabled: boolean) => {
        set({ isVideoEnabled: enabled })
      },

      setScreenSharing: (enabled: boolean) => {
        set({ isScreenSharing: enabled })
      },

      setAvailableDevices: (devices: CallState['availableDevices']) => {
        set({ availableDevices: devices })
      },

      setSelectedAudioDevice: (deviceId: string) => {
        set(state => ({
          availableDevices: {
            ...state.availableDevices,
            // Store selected device info if needed
          }
        }))
      },

      setSelectedVideoDevice: (deviceId: string) => {
        set(state => ({
          availableDevices: {
            ...state.availableDevices,
            // Store selected device info if needed
          }
        }))
      },

      setError: (error: string | null) => {
        set({ error })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      resetCallState: () => {
        set({
          ...initialState,
          callHistory: get().callHistory, // Preserve call history
        })
      },

      getCallById: (callId: string): Call | null => {
        const state = get()

        // Check current call
        if (state.currentCall?.id === callId) {
          return state.currentCall
        }

        // Check incoming call
        if (state.incomingCall?.id === callId) {
          return state.incomingCall
        }

        // Check call history
        const historyItem = state.callHistory.find(item => item.call.id === callId)
        return historyItem?.call || null
      },

      getCallHistoryItem: (callId: string): CallHistoryItem | null => {
        const state = get()
        return state.callHistory.find(item => item.call.id === callId) || null
      },
    }),
    {
      name: 'call-storage',
      partialize: (state) => ({
        // Persist settings and call history, but not active call state
        callHistory: state.callHistory.slice(0, 100), // Keep last 100 calls
        isAudioEnabled: state.isAudioEnabled,
        isVideoEnabled: state.isVideoEnabled,
        isScreenSharing: state.isScreenSharing,
        // Don't persist active call state as it should be fresh on reload
      }),
    }
  )
)

// Selectors for commonly used computed values
export const useCurrentCall = () => useCallStore(state => state.currentCall)
export const useIncomingCall = () => useCallStore(state => state.incomingCall)
export const useCallHistory = () => useCallStore(state => state.callHistory)
export const useCallLoading = () => useCallStore(state => state.isLoading)
export const useCallError = () => useCallStore(state => state.error)
export const useLocalStream = () => useCallStore(state => state.localStream)
export const useRemoteStreams = () => useCallStore(state => state.remoteStreams)
export const useCallControls = () => useCallStore(state => ({
  isAudioEnabled: state.isAudioEnabled,
  isVideoEnabled: state.isVideoEnabled,
  isScreenSharing: state.isScreenSharing
}))