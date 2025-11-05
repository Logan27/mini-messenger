import api from './api';
import { Call, ApiResponse } from '../types';

export const callAPI = {
  /**
   * Initiate a call to a recipient
   */
  initiateCall: async (recipientId: string, callType: 'audio' | 'video'): Promise<Call> => {
    const response = await api.post<ApiResponse<Call>>('/api/calls', {
      recipientId,
      callType,
    });
    return response.data.data;
  },

  /**
   * Respond to an incoming call (accept or reject)
   */
  respondToCall: async (callId: string, action: 'accept' | 'reject'): Promise<Call> => {
    const response = await api.post<ApiResponse<Call>>('/api/calls/respond', {
      callId,
      action,
    });
    return response.data.data;
  },

  /**
   * End an active call
   */
  endCall: async (callId: string): Promise<void> => {
    await api.post(`/api/calls/${callId}/end`);
  },

  /**
   * Get call details
   */
  getCallDetails: async (callId: string): Promise<Call> => {
    const response = await api.get<ApiResponse<Call>>(`/api/calls/${callId}`);
    return response.data.data;
  },

  /**
   * Get call history for the current user
   */
  getCallHistory: async (page: number = 1, limit: number = 20): Promise<Call[]> => {
    const response = await api.get<ApiResponse<Call[]>>('/api/calls', {
      params: { page, limit },
    });
    return response.data.data;
  },
};

export default callAPI;
