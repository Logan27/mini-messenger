import { useCallStore } from '../callStore';
import { callAPI } from '../../services/callService';

// Mock callAPI
jest.mock('../../services/callService', () => ({
  callAPI: {
    initiateCall: jest.fn(),
    respondToCall: jest.fn(),
    endCall: jest.fn(),
  },
}));

describe('callStore', () => {
  // Mock media stream
  const createMockStream = () => ({
    getAudioTracks: jest.fn(() => [
      { enabled: true, stop: jest.fn() },
    ]),
    getVideoTracks: jest.fn(() => [
      { enabled: true, stop: jest.fn() },
    ]),
    getTracks: jest.fn(() => [
      { stop: jest.fn() },
      { stop: jest.fn() },
    ]),
  });

  beforeEach(() => {
    // Reset store state
    useCallStore.setState({
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
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useCallStore.getState();

      expect(state.activeCall).toBeNull();
      expect(state.localStream).toBeNull();
      expect(state.remoteStream).toBeNull();
      expect(state.isMuted).toBe(false);
      expect(state.isVideoEnabled).toBe(false);
      expect(state.isSpeakerEnabled).toBe(false);
      expect(state.callDuration).toBe(0);
      expect(state.isConnecting).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('initiateCall', () => {
    it('initiates audio call successfully', async () => {
      const mockCall = {
        id: 'call-1',
        callerId: 'user-1',
        recipientId: 'user-2',
        callType: 'audio' as const,
        status: 'ringing' as const,
      };

      (callAPI.initiateCall as jest.Mock).mockResolvedValueOnce(mockCall);

      const result = await useCallStore.getState().initiateCall('user-2', 'audio');

      const state = useCallStore.getState();
      expect(result).toEqual(mockCall);
      expect(state.activeCall).toEqual(mockCall);
      expect(state.isVideoEnabled).toBe(false);
      expect(state.isConnecting).toBe(false);
      expect(state.error).toBeNull();
      expect(callAPI.initiateCall).toHaveBeenCalledWith('user-2', 'audio');
    });

    it('initiates video call successfully', async () => {
      const mockCall = {
        id: 'call-1',
        callerId: 'user-1',
        recipientId: 'user-2',
        callType: 'video' as const,
        status: 'ringing' as const,
      };

      (callAPI.initiateCall as jest.Mock).mockResolvedValueOnce(mockCall);

      await useCallStore.getState().initiateCall('user-2', 'video');

      const state = useCallStore.getState();
      expect(state.activeCall).toEqual(mockCall);
      expect(state.isVideoEnabled).toBe(true);
      expect(callAPI.initiateCall).toHaveBeenCalledWith('user-2', 'video');
    });

    it('sets connecting state during call initiation', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (callAPI.initiateCall as jest.Mock).mockReturnValueOnce(promise);

      const initiatePromise = useCallStore.getState().initiateCall('user-2', 'audio');

      expect(useCallStore.getState().isConnecting).toBe(true);

      resolvePromise!({
        id: 'call-1',
        callerId: 'user-1',
        recipientId: 'user-2',
        callType: 'audio',
        status: 'ringing',
      });
      await initiatePromise;

      expect(useCallStore.getState().isConnecting).toBe(false);
    });

    it('handles initiate call error', async () => {
      const mockError = {
        response: { data: { message: 'User not available' } },
      };
      (callAPI.initiateCall as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useCallStore.getState().initiateCall('user-2', 'audio');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      const state = useCallStore.getState();
      expect(state.error).toBe('User not available');
      expect(state.isConnecting).toBe(false);
      expect(state.activeCall).toBeNull();
    });
  });

  describe('acceptCall', () => {
    it('accepts audio call successfully', async () => {
      const mockCall = {
        id: 'call-1',
        callerId: 'user-1',
        recipientId: 'user-2',
        callType: 'audio' as const,
        status: 'active' as const,
      };

      (callAPI.respondToCall as jest.Mock).mockResolvedValueOnce(mockCall);

      await useCallStore.getState().acceptCall('call-1');

      const state = useCallStore.getState();
      expect(state.activeCall).toEqual(mockCall);
      expect(state.isVideoEnabled).toBe(false);
      expect(state.isConnecting).toBe(false);
      expect(callAPI.respondToCall).toHaveBeenCalledWith('call-1', 'accept');
    });

    it('accepts video call successfully', async () => {
      const mockCall = {
        id: 'call-1',
        callerId: 'user-1',
        recipientId: 'user-2',
        callType: 'video' as const,
        status: 'active' as const,
      };

      (callAPI.respondToCall as jest.Mock).mockResolvedValueOnce(mockCall);

      await useCallStore.getState().acceptCall('call-1');

      const state = useCallStore.getState();
      expect(state.activeCall).toEqual(mockCall);
      expect(state.isVideoEnabled).toBe(true);
    });

    it('handles accept call error', async () => {
      const mockError = {
        response: { data: { message: 'Call expired' } },
      };
      (callAPI.respondToCall as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useCallStore.getState().acceptCall('call-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      const state = useCallStore.getState();
      expect(state.error).toBe('Call expired');
      expect(state.isConnecting).toBe(false);
    });
  });

  describe('rejectCall', () => {
    it('rejects call successfully', async () => {
      useCallStore.setState({
        activeCall: {
          id: 'call-1',
          callerId: 'user-1',
          recipientId: 'user-2',
          callType: 'audio',
          status: 'ringing',
        },
      });

      (callAPI.respondToCall as jest.Mock).mockResolvedValueOnce({});

      await useCallStore.getState().rejectCall('call-1');

      const state = useCallStore.getState();
      expect(state.activeCall).toBeNull();
      expect(callAPI.respondToCall).toHaveBeenCalledWith('call-1', 'reject');
    });

    it('handles reject call error', async () => {
      const mockError = {
        response: { data: { message: 'Reject failed' } },
      };
      (callAPI.respondToCall as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useCallStore.getState().rejectCall('call-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      const state = useCallStore.getState();
      expect(state.error).toBe('Reject failed');
    });
  });

  describe('endCall', () => {
    it('ends call successfully', async () => {
      const mockLocalStream = createMockStream();
      const mockRemoteStream = createMockStream();

      useCallStore.setState({
        activeCall: {
          id: 'call-1',
          callerId: 'user-1',
          recipientId: 'user-2',
          callType: 'audio',
          status: 'active',
        },
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        isMuted: true,
        callDuration: 120,
      });

      (callAPI.endCall as jest.Mock).mockResolvedValueOnce({});

      await useCallStore.getState().endCall();

      const state = useCallStore.getState();
      expect(state.activeCall).toBeNull();
      expect(state.localStream).toBeNull();
      expect(state.remoteStream).toBeNull();
      expect(state.isMuted).toBe(false);
      expect(state.callDuration).toBe(0);
      expect(callAPI.endCall).toHaveBeenCalledWith('call-1');

      // Verify streams were stopped
      expect(mockLocalStream.getTracks).toHaveBeenCalled();
      expect(mockRemoteStream.getTracks).toHaveBeenCalled();
    });

    it('does nothing if no active call', async () => {
      useCallStore.setState({ activeCall: null });

      await useCallStore.getState().endCall();

      expect(callAPI.endCall).not.toHaveBeenCalled();
    });

    it('handles end call error', async () => {
      useCallStore.setState({
        activeCall: {
          id: 'call-1',
          callerId: 'user-1',
          recipientId: 'user-2',
          callType: 'audio',
          status: 'active',
        },
      });

      const mockError = {
        response: { data: { message: 'End call failed' } },
      };
      (callAPI.endCall as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useCallStore.getState().endCall();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      const state = useCallStore.getState();
      expect(state.error).toBe('End call failed');
    });
  });

  describe('Stream Management', () => {
    it('sets local stream', () => {
      const mockStream = createMockStream();

      useCallStore.getState().setLocalStream(mockStream);

      const state = useCallStore.getState();
      expect(state.localStream).toEqual(mockStream);
    });

    it('sets remote stream', () => {
      const mockStream = createMockStream();

      useCallStore.getState().setRemoteStream(mockStream);

      const state = useCallStore.getState();
      expect(state.remoteStream).toEqual(mockStream);
    });
  });

  describe('toggleMute', () => {
    it('mutes audio when unmuted', () => {
      const mockTrack = { enabled: true };
      const mockStream = {
        getAudioTracks: jest.fn(() => [mockTrack]),
      };

      useCallStore.setState({
        localStream: mockStream,
        isMuted: false,
      });

      useCallStore.getState().toggleMute();

      const state = useCallStore.getState();
      expect(state.isMuted).toBe(true);
      expect(mockTrack.enabled).toBe(false);
    });

    it('unmutes audio when muted', () => {
      const mockTrack = { enabled: false };
      const mockStream = {
        getAudioTracks: jest.fn(() => [mockTrack]),
      };

      useCallStore.setState({
        localStream: mockStream,
        isMuted: true,
      });

      useCallStore.getState().toggleMute();

      const state = useCallStore.getState();
      expect(state.isMuted).toBe(false);
      expect(mockTrack.enabled).toBe(true);
    });

    it('does nothing if no local stream', () => {
      useCallStore.setState({
        localStream: null,
        isMuted: false,
      });

      useCallStore.getState().toggleMute();

      const state = useCallStore.getState();
      expect(state.isMuted).toBe(false);
    });
  });

  describe('toggleVideo', () => {
    it('disables video when enabled', () => {
      const mockTrack = { enabled: true };
      const mockStream = {
        getVideoTracks: jest.fn(() => [mockTrack]),
      };

      useCallStore.setState({
        localStream: mockStream,
        isVideoEnabled: true,
      });

      useCallStore.getState().toggleVideo();

      const state = useCallStore.getState();
      expect(state.isVideoEnabled).toBe(false);
      expect(mockTrack.enabled).toBe(false);
    });

    it('enables video when disabled', () => {
      const mockTrack = { enabled: false };
      const mockStream = {
        getVideoTracks: jest.fn(() => [mockTrack]),
      };

      useCallStore.setState({
        localStream: mockStream,
        isVideoEnabled: false,
      });

      useCallStore.getState().toggleVideo();

      const state = useCallStore.getState();
      expect(state.isVideoEnabled).toBe(true);
      expect(mockTrack.enabled).toBe(true);
    });

    it('does nothing if no local stream', () => {
      useCallStore.setState({
        localStream: null,
        isVideoEnabled: false,
      });

      useCallStore.getState().toggleVideo();

      const state = useCallStore.getState();
      expect(state.isVideoEnabled).toBe(false);
    });
  });

  describe('toggleSpeaker', () => {
    it('enables speaker when disabled', () => {
      useCallStore.setState({ isSpeakerEnabled: false });

      useCallStore.getState().toggleSpeaker();

      const state = useCallStore.getState();
      expect(state.isSpeakerEnabled).toBe(true);
    });

    it('disables speaker when enabled', () => {
      useCallStore.setState({ isSpeakerEnabled: true });

      useCallStore.getState().toggleSpeaker();

      const state = useCallStore.getState();
      expect(state.isSpeakerEnabled).toBe(false);
    });
  });

  describe('State Management', () => {
    it('sets active call', () => {
      const mockCall = {
        id: 'call-1',
        callerId: 'user-1',
        recipientId: 'user-2',
        callType: 'audio' as const,
        status: 'active' as const,
      };

      useCallStore.getState().setActiveCall(mockCall);

      const state = useCallStore.getState();
      expect(state.activeCall).toEqual(mockCall);
    });

    it('clears active call', () => {
      useCallStore.setState({
        activeCall: {
          id: 'call-1',
          callerId: 'user-1',
          recipientId: 'user-2',
          callType: 'audio',
          status: 'active',
        },
      });

      useCallStore.getState().setActiveCall(null);

      const state = useCallStore.getState();
      expect(state.activeCall).toBeNull();
    });

    it('updates call status', () => {
      useCallStore.setState({
        activeCall: {
          id: 'call-1',
          callerId: 'user-1',
          recipientId: 'user-2',
          callType: 'audio',
          status: 'ringing',
        },
      });

      useCallStore.getState().updateCallStatus('active');

      const state = useCallStore.getState();
      expect(state.activeCall?.status).toBe('active');
    });

    it('does not update status if no active call', () => {
      useCallStore.setState({ activeCall: null });

      useCallStore.getState().updateCallStatus('active');

      const state = useCallStore.getState();
      expect(state.activeCall).toBeNull();
    });

    it('sets call duration', () => {
      useCallStore.getState().setCallDuration(120);

      const state = useCallStore.getState();
      expect(state.callDuration).toBe(120);
    });

    it('sets error', () => {
      useCallStore.getState().setError('Test error');

      const state = useCallStore.getState();
      expect(state.error).toBe('Test error');
    });

    it('clears error', () => {
      useCallStore.setState({ error: 'Test error' });

      useCallStore.getState().setError(null);

      const state = useCallStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('clearCallState', () => {
    it('clears all call state and stops streams', () => {
      const mockLocalStream = createMockStream();
      const mockRemoteStream = createMockStream();

      useCallStore.setState({
        activeCall: {
          id: 'call-1',
          callerId: 'user-1',
          recipientId: 'user-2',
          callType: 'video',
          status: 'active',
        },
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        isMuted: true,
        isVideoEnabled: true,
        isSpeakerEnabled: true,
        callDuration: 180,
        isConnecting: false,
        error: 'Some error',
      });

      useCallStore.getState().clearCallState();

      const state = useCallStore.getState();
      expect(state.activeCall).toBeNull();
      expect(state.localStream).toBeNull();
      expect(state.remoteStream).toBeNull();
      expect(state.isMuted).toBe(false);
      expect(state.isVideoEnabled).toBe(false);
      expect(state.isSpeakerEnabled).toBe(false);
      expect(state.callDuration).toBe(0);
      expect(state.isConnecting).toBe(false);
      expect(state.error).toBeNull();

      // Verify streams were stopped
      expect(mockLocalStream.getTracks).toHaveBeenCalled();
      expect(mockRemoteStream.getTracks).toHaveBeenCalled();
    });

    it('handles null streams gracefully', () => {
      useCallStore.setState({
        activeCall: {
          id: 'call-1',
          callerId: 'user-1',
          recipientId: 'user-2',
          callType: 'audio',
          status: 'active',
        },
        localStream: null,
        remoteStream: null,
      });

      expect(() => useCallStore.getState().clearCallState()).not.toThrow();

      const state = useCallStore.getState();
      expect(state.activeCall).toBeNull();
    });
  });
});
