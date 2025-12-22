import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { wsService } from './api';
import { useCallStore } from '../stores/callStore';
import { requestCallPermissions } from '../utils/permissions';

// STUN/TURN servers for ICE candidate gathering
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private isInitiator: boolean = false;
  private iceCandidateQueue: RTCIceCandidate[] = [];

  /**
   * Initialize local media stream (camera and/or microphone)
   */
  async initializeLocalStream(isVideo: boolean = false): Promise<MediaStream> {
    try {
      // Request permissions before accessing media
      const hasPermissions = await requestCallPermissions(isVideo);
      if (!hasPermissions) {
        throw new Error('Required permissions not granted');
      }

      const constraints = {
        audio: true,
        video: isVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
              facingMode: 'user',
            }
          : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      useCallStore.getState().setLocalStream(stream);

      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  /**
   * Create a new peer connection
   */
  createPeerConnection(callId: string, recipientId?: string): RTCPeerConnection {
    this.callId = callId;

    // Create peer connection with ICE servers
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    (this.peerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        // Send ICE candidate to the other peer via WebSocket
        const targetUserId = recipientId || this.getRemoteUserId();
        if (targetUserId) {
          wsService.emit('webrtc_ice_candidate', {
            callId: this.callId,
            candidate: event.candidate,
            targetUserId,
          });
        }
      }
    };

    // Handle ICE connection state changes
    (this.peerConnection as any).oniceconnectionstatechange = () => {
      if (this.peerConnection?.iceConnectionState === 'connected') {
        useCallStore.getState().updateCallStatus('connected');
      } else if (
        this.peerConnection?.iceConnectionState === 'disconnected' ||
        this.peerConnection?.iceConnectionState === 'failed'
      ) {
        this.handleConnectionFailure();
      }
    };

    // Handle remote stream
    (this.peerConnection as any).ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        useCallStore.getState().setRemoteStream(event.streams[0]);
      }
    };

    return this.peerConnection;
  }

  /**
   * Create and send SDP offer (caller initiates)
   */
  async createOffer(callId: string, recipientId: string): Promise<void> {
    this.isInitiator = true;

    if (!this.peerConnection) {
      this.createPeerConnection(callId, recipientId);
    }

    try {
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection!.setLocalDescription(offer);

      // Send offer to recipient via WebSocket
      wsService.emit('webrtc_offer', {
        callId,
        sdp: offer.sdp,
        recipientId,
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming SDP offer (recipient receives)
   */
  async handleOffer(callId: string, sdp: string, callerId: string): Promise<void> {
    this.isInitiator = false;

    if (!this.peerConnection) {
      this.createPeerConnection(callId, callerId);
    }

    try {
      const offer = new RTCSessionDescription({ type: 'offer', sdp });
      await this.peerConnection!.setRemoteDescription(offer);

      // Process any queued ICE candidates
      this.processIceCandidateQueue();
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  /**
   * Create and send SDP answer (recipient responds)
   */
  async createAnswer(callId: string, callerId: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer to caller via WebSocket
      wsService.emit('webrtc_answer', {
        callId,
        sdp: answer.sdp,
        callerId,
      });
    } catch (error) {
      console.error('Failed to create answer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming SDP answer (caller receives)
   */
  async handleAnswer(sdp: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const answer = new RTCSessionDescription({ type: 'answer', sdp });
      await this.peerConnection.setRemoteDescription(answer);

      // Process any queued ICE candidates
      this.processIceCandidateQueue();
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(candidate: any): Promise<void> {
    if (!this.peerConnection) {
      console.warn('Peer connection not ready, queueing ICE candidate');
      return;
    }

    try {
      // If remote description is not set yet, queue the candidate
      if (!this.peerConnection.remoteDescription) {
        this.iceCandidateQueue.push(new RTCIceCandidate(candidate));
        return;
      }

      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  /**
   * Process queued ICE candidates after remote description is set
   */
  private async processIceCandidateQueue(): Promise<void> {
    if (this.iceCandidateQueue.length === 0) return;

    for (const candidate of this.iceCandidateQueue) {
      try {
        await this.peerConnection?.addIceCandidate(candidate);
      } catch (error) {
        console.error('Failed to add queued ICE candidate:', error);
      }
    }

    this.iceCandidateQueue = [];
  }

  /**
   * Get the remote user ID from the active call
   */
  private getRemoteUserId(): string | null {
    const { activeCall } = useCallStore.getState();
    if (!activeCall) return null;

    // Determine if we are the caller or recipient
    const currentUserId = this.getCurrentUserId();
    return activeCall.callerId === currentUserId
      ? activeCall.recipientId
      : activeCall.callerId;
  }

  /**
   * Get current user ID (from auth store)
   */
  private getCurrentUserId(): string {
    // This should be imported from authStore, but for now we'll add it dynamically
    // You'll need to import useAuthStore and get the user ID
    return ''; // TODO: Get from auth store
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(): void {
    console.error('WebRTC connection failed or disconnected');
    useCallStore.getState().setError('Connection lost');
    // You might want to attempt reconnection or notify the user
  }

  /**
   * Toggle audio (mute/unmute)
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle video (on/off)
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // @ts-ignore - React Native WebRTC specific method
        videoTrack._switchCamera();
      }
    }
  }

  /**
   * Clean up and close connection
   */
  cleanup(): void {
    // Stop all local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Stop all remote stream tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear state
    this.callId = null;
    this.isInitiator = false;
    this.iceCandidateQueue = [];
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<any> {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      return stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService();
export default webrtcService;
