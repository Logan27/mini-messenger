// Mock dependencies BEFORE any imports
const mockWsService = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

const mockWebrtcService = {
  initializeLocalStream: jest.fn(),
  handleOffer: jest.fn(),
  createAnswer: jest.fn(),
  handleAnswer: jest.fn(),
  handleIceCandidate: jest.fn(),
  cleanup: jest.fn(),
};

const mockCallStoreState = {
  activeCall: null as any,
  setActiveCall: jest.fn(),
  updateCallStatus: jest.fn(),
  clearCallState: jest.fn(),
  setError: jest.fn(),
};

jest.mock('../api', () => ({
  __esModule: true,
  get wsService() {
    return mockWsService;
  },
}));

jest.mock('../webrtcService', () => ({
  __esModule: true,
  get webrtcService() {
    return mockWebrtcService;
  },
}));

jest.mock('../../stores/callStore', () => ({
  useCallStore: {
    getState: jest.fn(() => mockCallStoreState),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({})),
  },
}));

jest.mock('../navigationService', () => ({
  __esModule: true,
  navigate: jest.fn(),
}));

// NOW import the module under test
import {
  initializeCallWebSocketHandlers,
  cleanupCallWebSocketHandlers,
  sendMuteStatus,
  sendVideoToggleStatus,
} from '../callWebSocketHandler';
import { navigate } from '../navigationService';

describe('callWebSocketHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCallStoreState.activeCall = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initializeCallWebSocketHandlers', () => {
    it('registers all WebSocket event listeners', () => {
      initializeCallWebSocketHandlers();

      expect(mockWsService.on).toHaveBeenCalledWith('call.incoming', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('call.response', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('call.ended', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('webrtc_offer', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('webrtc_answer', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('webrtc_ice_candidate', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('call_mute', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('call_video_toggle', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledTimes(8);
    });
  });

  describe('call.incoming event handler', () => {
    it('handles incoming call and navigates to IncomingCall screen', () => {
      initializeCallWebSocketHandlers();

      const incomingCallHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call.incoming'
      )?.[1];

      const mockCall = {
        id: 'call-123',
        recipientId: 'user-456',
        callType: 'video',
      };

      incomingCallHandler({ call: mockCall });

      expect(mockCallStoreState.setActiveCall).toHaveBeenCalledWith(mockCall);
      expect(navigate).toHaveBeenCalledWith('IncomingCall', { call: mockCall });
    });

    it('handles invalid call.incoming data', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      initializeCallWebSocketHandlers();

      const incomingCallHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call.incoming'
      )?.[1];

      incomingCallHandler({ call: null });

      expect(mockCallStoreState.setActiveCall).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('call.response event handler', () => {
    it('handles accepted call response', () => {
      initializeCallWebSocketHandlers();

      const responseHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call.response'
      )?.[1];

      const mockCall = {
        id: 'call-123',
        status: 'accepted',
      };

      responseHandler({ call: mockCall, accepted: true });

      expect(mockCallStoreState.setActiveCall).toHaveBeenCalledWith(mockCall);
      expect(mockCallStoreState.updateCallStatus).toHaveBeenCalledWith('connected');
    });

    it('handles rejected call response', () => {
      initializeCallWebSocketHandlers();

      const responseHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call.response'
      )?.[1];

      const mockCall = {
        id: 'call-456',
        status: 'rejected',
      };

      responseHandler({ call: mockCall, accepted: false });

      expect(mockCallStoreState.updateCallStatus).toHaveBeenCalledWith('rejected');
      expect(mockCallStoreState.clearCallState).toHaveBeenCalled();
    });

    it('handles invalid call.response data', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      initializeCallWebSocketHandlers();

      const responseHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call.response'
      )?.[1];

      responseHandler({ call: null, accepted: true });

      expect(mockCallStoreState.setActiveCall).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('call.ended event handler', () => {
    it('handles call ended event for active call', () => {
      mockCallStoreState.activeCall = { id: 'call-123' };
      initializeCallWebSocketHandlers();

      const endedHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call.ended'
      )?.[1];

      endedHandler({ callId: 'call-123', reason: 'user_ended' });

      expect(mockCallStoreState.updateCallStatus).toHaveBeenCalledWith('ended');
      expect(mockWebrtcService.cleanup).toHaveBeenCalled();

      // Fast forward timer to check clearCallState is called after delay
      jest.advanceTimersByTime(1000);
      expect(mockCallStoreState.clearCallState).toHaveBeenCalled();
    });

    it('does not handle call.ended for different call', () => {
      mockCallStoreState.activeCall = { id: 'call-123' };
      initializeCallWebSocketHandlers();

      const endedHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call.ended'
      )?.[1];

      endedHandler({ callId: 'call-456' });

      expect(mockCallStoreState.updateCallStatus).not.toHaveBeenCalled();
      expect(mockWebrtcService.cleanup).not.toHaveBeenCalled();
    });
  });

  describe('webrtc_offer event handler', () => {
    it('handles WebRTC offer successfully', async () => {
      mockCallStoreState.activeCall = { id: 'call-123', callType: 'video' };
      initializeCallWebSocketHandlers();

      const offerHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'webrtc_offer'
      )?.[1];

      const offerData = {
        callId: 'call-123',
        sdp: 'mock-sdp',
        callerId: 'user-456',
      };

      await offerHandler(offerData);

      expect(mockWebrtcService.initializeLocalStream).toHaveBeenCalledWith(true);
      expect(mockWebrtcService.handleOffer).toHaveBeenCalledWith('call-123', 'mock-sdp', 'user-456');
      expect(mockWebrtcService.createAnswer).toHaveBeenCalledWith('call-123', 'user-456');
    });

    it('handles audio call offer', async () => {
      mockCallStoreState.activeCall = { id: 'call-789', callType: 'audio' };
      initializeCallWebSocketHandlers();

      const offerHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'webrtc_offer'
      )?.[1];

      await offerHandler({
        callId: 'call-789',
        sdp: 'mock-sdp',
        callerId: 'user-101',
      });

      expect(mockWebrtcService.initializeLocalStream).toHaveBeenCalledWith(false);
    });

    it('sets error when WebRTC offer handling fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCallStoreState.activeCall = { id: 'call-123', callType: 'video' };
      mockWebrtcService.handleOffer.mockRejectedValue(new Error('WebRTC error'));

      initializeCallWebSocketHandlers();

      const offerHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'webrtc_offer'
      )?.[1];

      await offerHandler({
        callId: 'call-123',
        sdp: 'mock-sdp',
        callerId: 'user-456',
      });

      expect(mockCallStoreState.setError).toHaveBeenCalledWith('Failed to establish connection');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('webrtc_answer event handler', () => {
    it('handles WebRTC answer successfully', async () => {
      initializeCallWebSocketHandlers();

      const answerHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'webrtc_answer'
      )?.[1];

      await answerHandler({ callId: 'call-123', sdp: 'mock-answer-sdp' });

      expect(mockWebrtcService.handleAnswer).toHaveBeenCalledWith('mock-answer-sdp');
    });

    it('sets error when WebRTC answer handling fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWebrtcService.handleAnswer.mockRejectedValue(new Error('Answer error'));

      initializeCallWebSocketHandlers();

      const answerHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'webrtc_answer'
      )?.[1];

      await answerHandler({ callId: 'call-123', sdp: 'mock-answer-sdp' });

      expect(mockCallStoreState.setError).toHaveBeenCalledWith('Failed to establish connection');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('webrtc_ice_candidate event handler', () => {
    it('handles ICE candidate successfully', async () => {
      initializeCallWebSocketHandlers();

      const iceCandidateHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'webrtc_ice_candidate'
      )?.[1];

      const candidateData = {
        callId: 'call-123',
        candidate: { candidate: 'ice-candidate', sdpMid: '0', sdpMLineIndex: 0 },
      };

      await iceCandidateHandler(candidateData);

      expect(mockWebrtcService.handleIceCandidate).toHaveBeenCalledWith(candidateData.candidate);
    });

    it('logs error when ICE candidate handling fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWebrtcService.handleIceCandidate.mockRejectedValue(new Error('ICE error'));

      initializeCallWebSocketHandlers();

      const iceCandidateHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'webrtc_ice_candidate'
      )?.[1];

      await iceCandidateHandler({
        callId: 'call-123',
        candidate: { candidate: 'ice-candidate' },
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to handle ICE candidate:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('call_mute event handler', () => {
    it('handles call_mute event', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      initializeCallWebSocketHandlers();

      const muteHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call_mute'
      )?.[1];

      muteHandler({ callId: 'call-123', userId: 'user-456', muted: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('Remote user mute status:', expect.any(Object));

      consoleLogSpy.mockRestore();
    });
  });

  describe('call_video_toggle event handler', () => {
    it('handles call_video_toggle event', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      initializeCallWebSocketHandlers();

      const videoToggleHandler = mockWsService.on.mock.calls.find(
        (call) => call[0] === 'call_video_toggle'
      )?.[1];

      videoToggleHandler({ callId: 'call-123', userId: 'user-456', enabled: false });

      expect(consoleLogSpy).toHaveBeenCalledWith('Remote user video status:', expect.any(Object));

      consoleLogSpy.mockRestore();
    });
  });

  describe('cleanupCallWebSocketHandlers', () => {
    it('removes all WebSocket event listeners', () => {
      cleanupCallWebSocketHandlers();

      expect(mockWsService.off).toHaveBeenCalledWith('call.incoming');
      expect(mockWsService.off).toHaveBeenCalledWith('call.response');
      expect(mockWsService.off).toHaveBeenCalledWith('call.ended');
      expect(mockWsService.off).toHaveBeenCalledWith('webrtc_offer');
      expect(mockWsService.off).toHaveBeenCalledWith('webrtc_answer');
      expect(mockWsService.off).toHaveBeenCalledWith('webrtc_ice_candidate');
      expect(mockWsService.off).toHaveBeenCalledWith('call_mute');
      expect(mockWsService.off).toHaveBeenCalledWith('call_video_toggle');
      expect(mockWsService.off).toHaveBeenCalledTimes(8);
    });
  });

  describe('sendMuteStatus', () => {
    it('emits call_mute event with call ID and mute status', () => {
      sendMuteStatus('call-123', true);

      expect(mockWsService.emit).toHaveBeenCalledWith('call_mute', {
        callId: 'call-123',
        muted: true,
      });
    });

    it('emits call_mute event when unmuting', () => {
      sendMuteStatus('call-456', false);

      expect(mockWsService.emit).toHaveBeenCalledWith('call_mute', {
        callId: 'call-456',
        muted: false,
      });
    });
  });

  describe('sendVideoToggleStatus', () => {
    it('emits call_video_toggle event with call ID and enabled status', () => {
      sendVideoToggleStatus('call-789', true);

      expect(mockWsService.emit).toHaveBeenCalledWith('call_video_toggle', {
        callId: 'call-789',
        enabled: true,
      });
    });

    it('emits call_video_toggle event when disabling video', () => {
      sendVideoToggleStatus('call-101', false);

      expect(mockWsService.emit).toHaveBeenCalledWith('call_video_toggle', {
        callId: 'call-101',
        enabled: false,
      });
    });
  });
});
