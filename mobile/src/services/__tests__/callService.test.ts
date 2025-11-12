import { callAPI } from '../callService';
import api from '../api';

// Mock the api module
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('callService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateCall', () => {
    it('sends POST request to initiate audio call', async () => {
      const mockCall = {
        id: 'call-123',
        recipientId: 'user-456',
        callType: 'audio' as const,
        status: 'initiated',
        createdAt: new Date().toISOString(),
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockCall },
        status: 200,
      });

      const result = await callAPI.initiateCall('user-456', 'audio');

      expect(api.post).toHaveBeenCalledWith('/api/calls', {
        recipientId: 'user-456',
        callType: 'audio',
      });
      expect(result).toEqual(mockCall);
    });

    it('sends POST request to initiate video call', async () => {
      const mockCall = {
        id: 'call-789',
        recipientId: 'user-101',
        callType: 'video' as const,
        status: 'initiated',
        createdAt: new Date().toISOString(),
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockCall },
        status: 200,
      });

      const result = await callAPI.initiateCall('user-101', 'video');

      expect(api.post).toHaveBeenCalledWith('/api/calls', {
        recipientId: 'user-101',
        callType: 'video',
      });
      expect(result).toEqual(mockCall);
    });
  });

  describe('respondToCall', () => {
    it('sends POST request to accept call', async () => {
      const mockCall = {
        id: 'call-123',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockCall },
        status: 200,
      });

      const result = await callAPI.respondToCall('call-123', 'accept');

      expect(api.post).toHaveBeenCalledWith('/api/calls/respond', {
        callId: 'call-123',
        action: 'accept',
      });
      expect(result).toEqual(mockCall);
    });

    it('sends POST request to reject call', async () => {
      const mockCall = {
        id: 'call-456',
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockCall },
        status: 200,
      });

      const result = await callAPI.respondToCall('call-456', 'reject');

      expect(api.post).toHaveBeenCalledWith('/api/calls/respond', {
        callId: 'call-456',
        action: 'reject',
      });
      expect(result).toEqual(mockCall);
    });
  });

  describe('endCall', () => {
    it('sends POST request to end call', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: { success: true },
        status: 200,
      });

      await callAPI.endCall('call-789');

      expect(api.post).toHaveBeenCalledWith('/api/calls/call-789/end');
    });

    it('handles call end without return value', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: {},
        status: 204,
      });

      const result = await callAPI.endCall('call-111');

      expect(result).toBeUndefined();
      expect(api.post).toHaveBeenCalledWith('/api/calls/call-111/end');
    });
  });

  describe('getCallDetails', () => {
    it('sends GET request to fetch call details', async () => {
      const mockCall = {
        id: 'call-123',
        recipientId: 'user-456',
        callType: 'video' as const,
        status: 'ended',
        duration: 1234,
        createdAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockCall },
        status: 200,
      });

      const result = await callAPI.getCallDetails('call-123');

      expect(api.get).toHaveBeenCalledWith('/api/calls/call-123');
      expect(result).toEqual(mockCall);
    });
  });

  describe('getCallHistory', () => {
    it('sends GET request with default pagination params', async () => {
      const mockHistory = [
        {
          id: 'call-1',
          recipientId: 'user-1',
          callType: 'audio' as const,
          status: 'ended',
          duration: 300,
        },
        {
          id: 'call-2',
          recipientId: 'user-2',
          callType: 'video' as const,
          status: 'ended',
          duration: 600,
        },
      ];

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockHistory },
        status: 200,
      });

      const result = await callAPI.getCallHistory();

      expect(api.get).toHaveBeenCalledWith('/api/calls', {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(mockHistory);
    });

    it('sends GET request with custom pagination params', async () => {
      const mockHistory = [
        {
          id: 'call-3',
          recipientId: 'user-3',
          callType: 'audio' as const,
          status: 'missed',
        },
      ];

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockHistory },
        status: 200,
      });

      const result = await callAPI.getCallHistory(2, 10);

      expect(api.get).toHaveBeenCalledWith('/api/calls', {
        params: { page: 2, limit: 10 },
      });
      expect(result).toEqual(mockHistory);
    });

    it('handles empty call history', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: { data: [] },
        status: 200,
      });

      const result = await callAPI.getCallHistory();

      expect(result).toEqual([]);
    });
  });

  describe('default export', () => {
    it('exports callAPI as default', () => {
      const defaultExport = require('../callService').default;
      expect(defaultExport).toBe(callAPI);
    });
  });
});
