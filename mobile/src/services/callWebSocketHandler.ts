import { wsService } from './api';
import { webrtcService } from './webrtcService';
import { useCallStore } from '../stores/callStore';
import { useAuthStore } from '../stores/authStore';
import { Call } from '../types';
import { navigate } from './navigationService';

/**
 * Initialize WebSocket event listeners for calling functionality
 */
export const initializeCallWebSocketHandlers = () => {
  console.log('Initializing call WebSocket handlers');

  // Handle incoming call
  wsService.on('call.incoming', (data: { call: Call }) => {
    console.log('Incoming call received:', data?.call);
    if (data?.call) {
      useCallStore.getState().setActiveCall(data.call);

      // Navigate to IncomingCallScreen
      navigate('IncomingCall', { call: data.call });
    } else {
      console.error('Received call.incoming event with invalid data:', data);
    }
  });

  // Handle call response (accept/reject)
  wsService.on('call.response', (data: { call: Call; accepted: boolean }) => {
    console.log('Call response received:', data);

    if (data?.call) {
      if (data.accepted) {
        useCallStore.getState().setActiveCall(data.call);
        useCallStore.getState().updateCallStatus('connected');
      } else {
        useCallStore.getState().updateCallStatus('rejected');
        useCallStore.getState().clearCallState();
      }
    } else {
      console.error('Received call.response event with invalid data:', data);
    }
  });

  // Handle call ended
  wsService.on('call.ended', (data: { callId: string; reason?: string }) => {
    console.log('Call ended:', data);

    const { activeCall } = useCallStore.getState();
    if (activeCall && activeCall.id === data.callId) {
      useCallStore.getState().updateCallStatus('ended');

      // Clean up WebRTC resources
      webrtcService.cleanup();

      // Clear call state after a short delay
      setTimeout(() => {
        useCallStore.getState().clearCallState();
      }, 1000);
    }
  });

  // Handle WebRTC offer
  wsService.on('webrtc_offer', async (data: { callId: string; sdp: string; callerId: string }) => {
    console.log('WebRTC offer received:', data.callId);

    try {
      // Initialize local stream for the recipient
      const { activeCall } = useCallStore.getState();
      if (activeCall) {
        await webrtcService.initializeLocalStream(activeCall.callType === 'video');
      }

      // Handle the offer
      await webrtcService.handleOffer(data.callId, data.sdp, data.callerId);

      // Create and send answer
      await webrtcService.createAnswer(data.callId, data.callerId);
    } catch (error) {
      console.error('Failed to handle WebRTC offer:', error);
      useCallStore.getState().setError('Failed to establish connection');
    }
  });

  // Handle WebRTC answer
  wsService.on('webrtc_answer', async (data: { callId: string; sdp: string }) => {
    console.log('WebRTC answer received:', data.callId);

    try {
      await webrtcService.handleAnswer(data.sdp);
    } catch (error) {
      console.error('Failed to handle WebRTC answer:', error);
      useCallStore.getState().setError('Failed to establish connection');
    }
  });

  // Handle ICE candidate
  wsService.on('webrtc_ice_candidate', async (data: { callId: string; candidate: any }) => {
    console.log('ICE candidate received:', data.callId);

    try {
      await webrtcService.handleIceCandidate(data.candidate);
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  });

  // Handle remote user mute/unmute
  wsService.on('call_mute', (data: { callId: string; userId: string; muted: boolean }) => {
    console.log('Remote user mute status:', data);
    // You can add visual indicators here for when the remote user mutes/unmutes
  });

  // Handle remote user video toggle
  wsService.on('call_video_toggle', (data: { callId: string; userId: string; enabled: boolean }) => {
    console.log('Remote user video status:', data);
    // You can add visual indicators here for when the remote user toggles video
  });
};

/**
 * Clean up WebSocket event listeners
 */
export const cleanupCallWebSocketHandlers = () => {
  console.log('Cleaning up call WebSocket handlers');

  wsService.off('call.incoming');
  wsService.off('call.response');
  wsService.off('call.ended');
  wsService.off('webrtc_offer');
  wsService.off('webrtc_answer');
  wsService.off('webrtc_ice_candidate');
  wsService.off('call_mute');
  wsService.off('call_video_toggle');
};

/**
 * Send mute status to remote peer
 */
export const sendMuteStatus = (callId: string, muted: boolean) => {
  wsService.emit('call_mute', { callId, muted });
};

/**
 * Send video toggle status to remote peer
 */
export const sendVideoToggleStatus = (callId: string, enabled: boolean) => {
  wsService.emit('call_video_toggle', { callId, enabled });
};
