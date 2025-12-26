import apiClient from '@/lib/api-client';

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface TurnCredentialsResponse {
  success: boolean;
  data: {
    iceServers: IceServer[];
    expiresAt: number;
    ttl: number;
  };
}

export interface CallResponse {
  success: boolean;
  data: {
    id: string;
    callerId: string;
    recipientId: string;
    callType: 'video' | 'audio';
    status: 'calling' | 'connected' | 'ended' | 'rejected' | 'missed';
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
  };
  message?: string;
}

// Cache for TURN credentials to avoid unnecessary requests
let cachedCredentials: TurnCredentialsResponse['data'] | null = null;
let credentialsExpiresAt = 0;

export const callService = {
  /**
   * Get TURN server credentials for WebRTC
   * Credentials are cached and refreshed when expired
   */
  async getTurnCredentials(): Promise<TurnCredentialsResponse['data']> {
    // Return cached credentials if still valid (with 5 min buffer)
    const now = Math.floor(Date.now() / 1000);
    if (cachedCredentials && credentialsExpiresAt > now + 300) {
      return cachedCredentials;
    }

    const response = await apiClient.get<TurnCredentialsResponse>('/calls/turn-credentials');

    if (response.data.success) {
      cachedCredentials = response.data.data;
      credentialsExpiresAt = response.data.data.expiresAt;
    }

    return response.data.data;
  },

  /**
   * Get RTCPeerConnection configuration with fresh TURN credentials
   */
  async getRTCConfiguration(): Promise<RTCConfiguration> {
    try {
      const { iceServers } = await this.getTurnCredentials();
      return {
        iceServers,
        iceCandidatePoolSize: 10,
      };
    } catch (error) {
      console.warn('Failed to fetch TURN credentials, using STUN-only fallback:', error);
      // Fallback to public STUN servers if TURN fetch fails
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      };
    }
  },

  /**
   * Initiate a call
   */
  async initiateCall(recipientId: string, callType: 'video' | 'audio'): Promise<CallResponse> {
    const response = await apiClient.post<CallResponse>('/calls', {
      recipientId,
      callType,
    });
    return response.data;
  },

  /**
   * Respond to an incoming call
   */
  async respondToCall(callId: string, response: 'accept' | 'reject'): Promise<CallResponse> {
    const res = await apiClient.post<CallResponse>('/calls/respond', {
      callId,
      response,
    });
    return res.data;
  },

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<CallResponse> {
    const response = await apiClient.post<CallResponse>(`/calls/${callId}/end`);
    return response.data;
  },

  /**
   * Get call details
   */
  async getCallDetails(callId: string): Promise<CallResponse> {
    const response = await apiClient.get<CallResponse>(`/calls/${callId}`);
    return response.data;
  },

  /**
   * Clear cached credentials (useful for logout)
   */
  clearCache(): void {
    cachedCredentials = null;
    credentialsExpiresAt = 0;
  },
};

export default callService;
