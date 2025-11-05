import { create } from 'zustand';
import { Call } from '../types';
import { callAPI } from '../services/callService';

interface CallState {
  activeCall: Call | null;
  localStream: any; // MediaStream from react-native-webrtc
  remoteStream: any; // MediaStream from react-native-webrtc
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerEnabled: boolean;
  callDuration: number;
  isConnecting: boolean;
  error: string | null;

  // Call actions
  initiateCall: (recipientId: string, callType: 'audio' | 'video') => Promise<Call>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;

  // Stream actions
  setLocalStream: (stream: any) => void;
  setRemoteStream: (stream: any) => void;

  // Control actions
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;

  // State management
  setActiveCall: (call: Call | null) => void;
  updateCallStatus: (status: Call['status']) => void;
  setCallDuration: (duration: number) => void;
  clearCallState: () => void;
  setError: (error: string | null) => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  // Initial state
  activeCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoEnabled: false,
  isSpeakerEnabled: false,
  callDuration: 0,
  isConnecting: false,
  error: null,

  // Call actions
  initiateCall: async (recipientId: string, callType: 'audio' | 'video') => {
    set({ isConnecting: true, error: null });

    try {
      const call = await callAPI.initiateCall(recipientId, callType);
      set({
        activeCall: call,
        isConnecting: false,
        isVideoEnabled: callType === 'video',
      });
      return call;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to initiate call';
      set({ error: errorMessage, isConnecting: false });
      throw error;
    }
  },

  acceptCall: async (callId: string) => {
    set({ isConnecting: true, error: null });

    try {
      const call = await callAPI.respondToCall(callId, 'accept');
      set({
        activeCall: call,
        isConnecting: false,
        isVideoEnabled: call.callType === 'video',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to accept call';
      set({ error: errorMessage, isConnecting: false });
      throw error;
    }
  },

  rejectCall: async (callId: string) => {
    try {
      await callAPI.respondToCall(callId, 'reject');
      set({ activeCall: null });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to reject call';
      set({ error: errorMessage });
      throw error;
    }
  },

  endCall: async () => {
    const { activeCall } = get();
    if (!activeCall) return;

    try {
      await callAPI.endCall(activeCall.id);
      get().clearCallState();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to end call';
      set({ error: errorMessage });
      throw error;
    }
  },

  // Stream actions
  setLocalStream: (stream: any) => {
    set({ localStream: stream });
  },

  setRemoteStream: (stream: any) => {
    set({ remoteStream: stream });
  },

  // Control actions
  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = isMuted; // Toggle the audio track
      });
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = !isVideoEnabled; // Toggle the video track
      });
      set({ isVideoEnabled: !isVideoEnabled });
    }
  },

  toggleSpeaker: () => {
    set((state) => ({ isSpeakerEnabled: !state.isSpeakerEnabled }));
  },

  // State management
  setActiveCall: (call: Call | null) => {
    set({ activeCall: call });
  },

  updateCallStatus: (status: Call['status']) => {
    const { activeCall } = get();
    if (activeCall) {
      set({ activeCall: { ...activeCall, status } });
    }
  },

  setCallDuration: (duration: number) => {
    set({ callDuration: duration });
  },

  clearCallState: () => {
    const { localStream, remoteStream } = get();

    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track: any) => track.stop());
    }

    set({
      activeCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoEnabled: false,
      isSpeakerEnabled: false,
      callDuration: 0,
      isConnecting: false,
      error: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

export default useCallStore;
