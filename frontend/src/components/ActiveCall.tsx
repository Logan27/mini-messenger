import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Settings,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { socketService } from '@/services/socket.service';
import { callService } from '@/services/call.service';
import { getAvatarUrl } from '@/lib/avatar-utils';

interface ActiveCallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  callType: 'video' | 'voice' | 'audio'; // Support both 'voice' and 'audio'
  isInitiator: boolean;
}

export function ActiveCall({
  open,
  onOpenChange,
  callId,
  participantId,
  participantName,
  participantAvatar,
  callType,
  isInitiator,
}: ActiveCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(callType === 'video');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const webrtcListenersRef = useRef<(() => void)[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseGateRef = useRef<GainNode | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const rtcConfigRef = useRef<RTCConfiguration | null>(null);

  // Fallback WebRTC configuration (used if TURN credential fetch fails)
  const fallbackRtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    console.log(`🔄 ActiveCall useEffect: open=${open}, isInitiator=${isInitiator}`);

    if (!open) {
      console.log('❌ ActiveCall closed, running cleanup');
      cleanupCall();
      return;
    }

    console.log('🚀 ActiveCall opened, preparing WebRTC...');

    // Cleanup any previous call first
    cleanupCall();

    // Register WebRTC signal listeners IMMEDIATELY before any delays
    // This ensures we catch early signals from the backend
    console.log('🔌 Registering WebRTC signal listeners (EARLY)...');
    setupWebRTCListeners();
    console.log('✅ WebRTC signal listeners ready');

    // Wait for device enumeration to complete before initializing call
    // This ensures selectedMicrophone is set before getUserMedia is called
    const initializeWithDevices = async () => {
      try {
        // Enumerate devices first
        console.log('🎙️ Enumerating audio devices before call initialization...');
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Filter and deduplicate audio devices by deviceId
        const audioInputs = devices
          .filter(d => d.kind === 'audioinput' && d.deviceId)
          .filter((device, index, self) =>
            index === self.findIndex(d => d.deviceId === device.deviceId)
          );

        const audioOutputs = devices
          .filter(d => d.kind === 'audiooutput' && d.deviceId)
          .filter((device, index, self) =>
            index === self.findIndex(d => d.deviceId === device.deviceId)
          );

        // Set devices immediately before initializing call
        setAudioDevices([...audioInputs, ...audioOutputs]);

        // Determine which microphone to use
        let micToUse = selectedMicrophone;
        if (!micToUse && audioInputs.length > 0) {
          micToUse = audioInputs[0].deviceId;
          console.log('🎤 Will use default microphone:', audioInputs[0].label || micToUse.slice(0, 10));
          setSelectedMicrophone(micToUse);
        }

        // Set default speaker
        if (audioOutputs.length > 0 && !selectedSpeaker) {
          const defaultSpeaker = audioOutputs[0].deviceId;
          console.log('🔊 Setting default speaker:', audioOutputs[0].label || defaultSpeaker.slice(0, 10));
          setSelectedSpeaker(defaultSpeaker);
        }

        console.log('✅ Devices enumerated:', {
          inputs: audioInputs.length,
          outputs: audioOutputs.length,
          microphoneToUse: micToUse || 'default'
        });

        // For RECEIVER: Initialize peer connection immediately
        // For INITIATOR: Add delay to ensure browser releases devices from previous call
        const delay = isInitiator ? 1000 : 0;

        if (delay > 0) {
          console.log(`⏱️ Waiting ${delay}ms before initializing call (initiator)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log('⏰ Initializing call now with microphone:', micToUse || 'default');
        initializeCall(micToUse);
        setCallDuration(0);
      } catch (err) {
        console.error('❌ Failed to initialize call with devices:', err);
        toast.error('Failed to access audio devices');
      }
    };

    initializeWithDevices();

    return () => {
      console.log('🧹 Cleanup: cleaning up call');
      cleanupCall();
    };
  }, [open, isInitiator]);

  // Call duration timer
  useEffect(() => {
    if (!open || connectionStatus !== 'connected') return;

    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [open, connectionStatus]);

  // Listen for call.ended event (from backend) and call_ended (from frontend peer)
  useEffect(() => {
    if (!open) return;

    const handleCallEnded = (data: { callId: string; endedBy?: string; to?: string }) => {
      if (data.callId === callId) {
        console.log('📞 Received call ended event:', data);
        toast.info('Call ended by other participant');
        onOpenChange(false);
      }
    };

    const unsubscribe1 = socketService.on('call.ended', handleCallEnded);
    const unsubscribe2 = socketService.on('call_ended', handleCallEnded);

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [open, callId, onOpenChange]);

  // Listen for device changes (hot-plug)
  useEffect(() => {
    if (!open) return;

    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Filter and deduplicate audio devices by deviceId
        const audioInputs = devices
          .filter(d => d.kind === 'audioinput' && d.deviceId)
          .filter((device, index, self) =>
            index === self.findIndex(d => d.deviceId === device.deviceId)
          );

        const audioOutputs = devices
          .filter(d => d.kind === 'audiooutput' && d.deviceId)
          .filter((device, index, self) =>
            index === self.findIndex(d => d.deviceId === device.deviceId)
          );

        setAudioDevices([...audioInputs, ...audioOutputs]);

        console.log('🔄 Device list updated (hot-plug):', {
          inputs: audioInputs.length,
          outputs: audioOutputs.length
        });
      } catch (err) {
        console.error('❌ Failed to enumerate devices:', err);
      }
    };

    // Listen for device changes (plug/unplug)
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, [open]);

  // Helper function to attach remote stream to video element
  const attachRemoteStream = () => {
    if (!remoteStreamRef.current || !remoteVideoRef.current) {
      console.log('⏳ Stream or video element not ready, will retry on next render');
      return;
    }

    const videoElement = remoteVideoRef.current;
    const stream = remoteStreamRef.current;

    // Only attach if not already attached
    if (videoElement.srcObject === stream) {
      console.log('✅ Stream already attached');
      return;
    }

    videoElement.srcObject = stream;

    // Critical: Ensure the element is NOT muted
    videoElement.muted = false;
    videoElement.volume = 1.0;

    console.log('✅ Remote stream attached to video element');
    console.log('🎵 Remote stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    console.log('🔊 Video element audio settings:', {
      muted: videoElement.muted,
      volume: videoElement.volume,
      paused: videoElement.paused
    });

    // Force play to ensure audio/video starts
    videoElement.play()
      .then(() => {
        console.log('✅ Remote media playback started successfully');
      })
      .catch(err => {
        console.error('❌ Autoplay failed:', err);
        toast.error('Please click anywhere to enable audio', {
          duration: 5000
        });

        // Add click handler to enable audio on user interaction
        const enableAudio = () => {
          videoElement.play().then(() => {
            console.log('✅ Audio enabled after user interaction');
            document.removeEventListener('click', enableAudio);
          });
        };
        document.addEventListener('click', enableAudio, { once: true });
      });
  };

  // Re-attach remote stream when hasRemoteVideo changes (video element switches)
  useEffect(() => {
    if (open && remoteStreamRef.current) {
      // Small delay to ensure the new video element is mounted
      const timer = setTimeout(() => {
        attachRemoteStream();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hasRemoteVideo, open]);

  const setupWebRTCListeners = () => {
    console.log('🔧 setupWebRTCListeners called, participantId:', participantId);

    // Clean up any existing listeners first
    webrtcListenersRef.current.forEach(unsub => unsub());
    webrtcListenersRef.current = [];

    const handleOffer = async (data: { from: string; signal?: RTCSessionDescriptionInit; offer?: RTCSessionDescriptionInit }) => {
      console.log('🔔 handleOffer triggered! from:', data.from, 'participantId:', participantId);
      if (data.from !== participantId) {
        console.log('⚠️ Ignoring offer from wrong participant:', data.from);
        return;
      }

      // Extract offer from either signal or offer property (for backward compatibility)
      const offerData = data.signal || data.offer;
      if (!offerData || !offerData.type || !offerData.sdp) {
        console.error('❌ Invalid offer received:', data);
        toast.error('Received invalid call offer');
        return;
      }

      console.log('📥 Received WebRTC offer from', data.from);
      try {
        // Wait for peer connection to be ready (with timeout)
        let peerConnection = peerConnectionRef.current;
        if (!peerConnection) {
          console.log('⏳ Peer connection not ready, storing offer for later...');
          pendingOfferRef.current = offerData;
          return;
        }

        console.log('⚙️ Setting remote description (offer)...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData));
        console.log('✅ Remote description set');

        console.log('⚙️ Creating answer...');
        const answer = await peerConnection.createAnswer();
        console.log('⚙️ Setting local description (answer)...');
        await peerConnection.setLocalDescription(answer);
        console.log('✅ Local description set');

        sendSignal('answer', answer);
        console.log('📤 Answer sent');
      } catch (err) {
        console.error('❌ Failed to handle offer:', err);
        toast.error('Failed to process call offer');
      }
    };

    const handleAnswer = async (data: { from: string; signal: RTCSessionDescriptionInit }) => {
      if (data.from !== participantId) {
        console.log('⚠️ Ignoring answer from wrong participant:', data.from);
        return;
      }

      console.log('📥 Received WebRTC answer from', data.from);
      try {
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) {
          console.error('❌ No peer connection available! Waiting for initialization...');
          return;
        }

        console.log('⚙️ Setting remote description (answer)...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        console.log('✅ Remote description set, connection should establish soon');
      } catch (err) {
        console.error('❌ Failed to handle answer:', err);
      }
    };

    const handleIceCandidate = async (data: { from: string; signal: RTCIceCandidateInit }) => {
      if (data.from !== participantId) {
        console.log('⚠️ Ignoring ICE candidate from wrong participant:', data.from);
        return;
      }

      console.log('📥 Received ICE candidate from', data.from, '- type:', data.signal.candidate?.split(' ')[7]);

      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) {
        console.log('📦 Queuing ICE candidate (peer connection not ready)');
        pendingIceCandidatesRef.current.push(data.signal);
        return;
      }

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
        console.log('✅ ICE candidate added');
      } catch (err) {
        console.error('❌ Failed to add ICE candidate:', err);
      }
    };

    console.log('📡 Subscribing to WebRTC events...');
    const unsubscribeOffer = socketService.on('webrtc_offer', handleOffer);
    console.log('✅ Subscribed to webrtc_offer');
    const unsubscribeAnswer = socketService.on('webrtc_answer', handleAnswer);
    console.log('✅ Subscribed to webrtc_answer');
    const unsubscribeIce = socketService.on('webrtc_ice_candidate', handleIceCandidate);
    console.log('✅ Subscribed to webrtc_ice_candidate');

    webrtcListenersRef.current = [unsubscribeOffer, unsubscribeAnswer, unsubscribeIce];
    console.log('✅ All WebRTC listeners registered and stored');
  };

  const initializeCall = async (microphoneId?: string) => {
    try {
      // Double-check cleanup happened before starting
      if (localStreamRef.current || peerConnectionRef.current) {
        console.warn('⚠️ Resources not fully cleaned up, forcing cleanup...');
        cleanupCall();
        // Wait longer if we had to force cleanup to ensure devices are released
        console.log('⏳ Waiting for device release...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Fetch TURN credentials from the server (with STUN fallback)
      console.log('🔑 Fetching TURN credentials...');
      try {
        rtcConfigRef.current = await callService.getRTCConfiguration();
        console.log('✅ TURN credentials fetched:', {
          iceServers: rtcConfigRef.current.iceServers?.length || 0,
          hasTurn: rtcConfigRef.current.iceServers?.some(s =>
            (typeof s.urls === 'string' ? s.urls : s.urls?.[0])?.startsWith('turn:')
          ),
        });
      } catch (err) {
        console.warn('⚠️ Failed to fetch TURN credentials, using fallback:', err);
        rtcConfigRef.current = fallbackRtcConfig;
      }

      // Use provided microphone ID or fall back to selected state
      const micToUse = microphoneId || selectedMicrophone;

      // Request media permissions with high-quality audio settings
      // Use ideal instead of exact to avoid constraint failures
      // Set noiseSuppression to false to avoid overly aggressive noise cancellation that reduces voice quality
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true, // Re-enabled to help with laptop echo
        autoGainControl: true,
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 1 },
        ...(micToUse && micToUse !== 'default' ? { deviceId: { ideal: micToUse } } : {}),
      };

      console.log('🎥 Requesting media devices...', {
        video: callType === 'video',
        audio: audioConstraints,
        microphone: micToUse || 'default'
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audioConstraints,
      });

      localStreamRef.current = stream;
      console.log('✅ Media devices acquired');

      // Enumerate devices AFTER getUserMedia to get device labels
      const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
      const audioInputsWithLabels = devicesWithLabels
        .filter(d => d.kind === 'audioinput' && d.deviceId)
        .filter((device, index, self) =>
          index === self.findIndex(d => d.deviceId === device.deviceId)
        );
      const audioOutputsWithLabels = devicesWithLabels
        .filter(d => d.kind === 'audiooutput' && d.deviceId)
        .filter((device, index, self) =>
          index === self.findIndex(d => d.deviceId === device.deviceId)
        );
      setAudioDevices([...audioInputsWithLabels, ...audioOutputsWithLabels]);
      console.log('✅ Devices updated with labels:', {
        inputs: audioInputsWithLabels.length,
        outputs: audioOutputsWithLabels.length
      });

      // Log audio track details and verify constraints
      const audioTracks = stream.getAudioTracks();
      console.log('🎤 Audio tracks:', audioTracks.length);
      audioTracks.forEach(track => {
        console.log(`  - ${track.label}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);

        // Check actual applied settings
        const settings = track.getSettings();
        console.log('  🎛️ Applied audio settings:', {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
        });
      });

      // Skip custom audio processing - it causes issues with microphone initialization
      // Noise suppression is disabled to prevent voice from being too quiet
      console.log('✅ Using browser native audio processing (echo cancellation, auto gain) - noise suppression disabled');

      // Display local video
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection with fetched TURN credentials (or fallback)
      const rtcConfig = rtcConfigRef.current || fallbackRtcConfig;
      console.log('🔧 Creating peer connection with config:', {
        iceServers: rtcConfig.iceServers?.length || 0,
      });
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      console.log('📤 Adding local tracks to peer connection:');
      stream.getTracks().forEach(track => {
        console.log(`  - Adding ${track.kind} track: ${track.label} (enabled=${track.enabled})`);
        peerConnection.addTrack(track, stream);
      });
      console.log('✅ All local tracks added to peer connection');

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('🎵 Received remote track:', event.track.kind);

        // Store the remote stream in a ref so we can re-attach it after state changes
        remoteStreamRef.current = event.streams[0];

        // Check if this is a video track
        if (event.track.kind === 'video') {
          console.log('📹 Video track detected - enabling video view');
          setHasRemoteVideo(true);
        }

        // Attach stream to video element
        attachRemoteStream();
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('🧊 Generated ICE candidate:', event.candidate.type);
          await sendIceCandidate(event.candidate);
        } else {
          console.log('🧊 ICE gathering complete');
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log('🔌 Connection state changed:', state);
        if (state === 'connected') {
          console.log('✅ WebRTC connection established!');
          setConnectionStatus('connected');
        } else if (state === 'failed' || state === 'disconnected') {
          console.log('❌ Connection failed or disconnected:', state);
          setConnectionStatus('failed');
          toast.error('Call connection failed');
          handleEndCall();
        }
      };

      // Monitor network quality
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log('🧊 ICE connection state changed:', iceState);
        monitorNetworkQuality();
      };

      // WebRTC listeners already registered early (before this function was called)
      console.log('✅ Using pre-registered WebRTC listeners');

      // Process any pending offer that arrived before peer connection was ready
      if (pendingOfferRef.current) {
        console.log('📦 Processing pending offer...');
        const pendingOffer = pendingOfferRef.current;
        pendingOfferRef.current = null;
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));
          console.log('✅ Pending offer processed, creating answer...');
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          sendSignal('answer', answer);
          console.log('✅ Answer sent for pending offer');
        } catch (err) {
          console.error('❌ Failed to process pending offer:', err);
        }
      }

      // Process any pending ICE candidates
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`📦 Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates...`);
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ Pending ICE candidate added');
          } catch (err) {
            console.error('❌ Failed to add pending ICE candidate:', err);
          }
        }
        pendingIceCandidatesRef.current = [];
      }

      // If initiator, create and send offer
      if (isInitiator) {
        console.log('📞 I am the initiator, creating and sending offer...');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignal('offer', offer);
        console.log('✅ Offer created and sent');
      } else {
        console.log('📞 I am the receiver, waiting for offer from initiator...');
      }

    } catch (err) {
      console.error('Failed to initialize call:', err);
      toast.error('Failed to access camera/microphone');
      handleEndCall();
    }
  };

  const cleanupCall = () => {
    console.log('🧹 Cleaning up call resources...');

    // Clear pending signal queues
    pendingOfferRef.current = null;
    pendingIceCandidatesRef.current = [];

    // Unsubscribe from WebRTC listeners
    webrtcListenersRef.current.forEach(unsub => unsub());
    webrtcListenersRef.current = [];

    // Stop all media tracks and clear video elements
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });

      // Clear video element srcObject
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      localStreamRef.current = null;
    }

    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log('🔌 Closed peer connection');
    }

    // Clean up Web Audio API resources
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      noiseGateRef.current = null;
      console.log('🎛️ Closed AudioContext');
    }
  };

  // Enhance SDP with higher bitrates for better quality
  const enhanceSDP = (sdp: string): string => {
    // Increase audio bitrate to 128kbps (default is ~32kbps)
    let enhancedSdp = sdp.replace(
      /(m=audio.*\r\n)/g,
      '$1b=AS:128\r\n'
    );

    // Set Opus codec parameters for high quality
    // maxaveragebitrate: 128000 (128kbps)
    // stereo: 0 (mono for calls)
    // usedtx: 0 (disable discontinuous transmission for better quality)
    enhancedSdp = enhancedSdp.replace(
      /(a=fmtp:\d+ .*)(minptime=\d+)/g,
      '$1$2;maxaveragebitrate=128000;stereo=0;usedtx=0'
    );

    // Increase video bitrate to 2.5 Mbps if video call
    if (callType === 'video') {
      enhancedSdp = enhancedSdp.replace(
        /(m=video.*\r\n)/g,
        '$1b=AS:2500\r\n'
      );
    }

    console.log('🎚️ Enhanced SDP with higher bitrates');
    return enhancedSdp;
  };

  const sendSignal = (type: 'offer' | 'answer', signal: RTCSessionDescriptionInit) => {
    // Enhance the SDP before sending
    const enhancedSignal = {
      ...signal,
      sdp: signal.sdp ? enhanceSDP(signal.sdp) : signal.sdp
    };

    const eventType = type === 'offer' ? 'webrtc_offer' : 'webrtc_answer';
    socketService.send(eventType, {
      targetUserId: participantId,
      signal: enhancedSignal,
    });
    console.log(`📤 Sent WebRTC ${type} to ${participantId}`);
  };

  const sendIceCandidate = (candidate: RTCIceCandidate) => {
    socketService.send('webrtc_ice_candidate', {
      targetUserId: participantId,
      signal: candidate.toJSON(),
    });
    console.log(`📤 Sent ICE candidate to ${participantId}`);
  };

  const monitorNetworkQuality = async () => {
    if (!peerConnectionRef.current) return;

    try {
      const stats = await peerConnectionRef.current.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp') {
          packetsLost += report.packetsLost || 0;
          packetsReceived += report.packetsReceived || 0;
        }
      });

      const lossRate = packetsReceived > 0 ? packetsLost / packetsReceived : 0;

      if (lossRate < 0.02) {
        setNetworkQuality('good');
      } else if (lossRate < 0.05) {
        setNetworkQuality('fair');
      } else {
        setNetworkQuality('poor');
      }
    } catch (err) {
      console.error('Failed to get stats:', err);
    }
  };

  const handleToggleMute = () => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);

      // Notify remote peer via call control events
      const event = audioTrack.enabled ? 'call_unmute' : 'call_mute';
      socketService.send(event, { targetUserId: participantId });
    }
  };

  const handleToggleVideo = async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];

    if (videoTrack) {
      // If video track exists, just toggle it on/off
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      setIsVideoOff(!newState);

      // Update local video element
      if (newState && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      // Notify remote peer via call control events
      const event = newState ? 'call_video_on' : 'call_video_off';
      socketService.send(event, { targetUserId: participantId });
    } else {
      // No video track exists - upgrade audio call to video call
      try {
        console.log('📹 Upgrading audio call to video call');

        // Check if camera is available
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) {
          toast.error('No camera found');
          return;
        }

        // Request camera access
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });

        const videoTrack = videoStream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error('Failed to get video track');
        }

        // Add video track to local stream
        localStreamRef.current.addTrack(videoTrack);

        // Add video track to peer connection
        const sender = peerConnectionRef.current.addTrack(videoTrack, localStreamRef.current);
        console.log('✅ Video track added to peer connection:', sender);

        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        setIsVideoOff(false);

        // CRITICAL: Trigger renegotiation to inform remote peer about the new track
        console.log('🔄 Starting renegotiation to add video track...');

        if (isInitiator) {
          // If we're the initiator, create a new offer
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);

          console.log('📤 Sending renegotiation offer');
          socketService.send('webrtc_offer', {
            targetUserId: participantId,
            signal: offer,  // Use 'signal' instead of 'offer' to match backend expectations
            callId: callId,
          });
        } else {
          // If we're not the initiator, we need to wait for the remote peer to create an offer
          // In WebRTC, typically the original initiator should create the renegotiation offer
          // But for simplicity, we'll just create an offer anyway
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);

          console.log('📤 Sending renegotiation offer (as answerer)');
          socketService.send('webrtc_offer', {
            targetUserId: participantId,
            signal: offer,  // Use 'signal' instead of 'offer' to match backend expectations
            callId: callId,
          });
        }

        toast.success('Camera enabled');
      } catch (error) {
        console.error('❌ Failed to enable camera:', error);

        // Provide specific error messages
        if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          toast.error('Camera is already in use by another application');
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          toast.error('Camera permission denied');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          toast.error('No camera found');
        } else {
          toast.error('Failed to enable camera. Please try again.');
        }
      }
    }
  };

  const handleEndCall = async () => {
    try {
      await callService.endCall(callId);


    } catch (err) {
      // Network errors are common during call cleanup, don't show to user
      console.error('Failed to end call:', err);
    }

    // Always emit socket event to notify other user (workaround for API issues)
    try {
      socketService.send('call_ended', {
        callId,
        to: participantId,
      });
      console.log('📤 Sent call_ended event to', participantId);
    } catch (err) {
      console.error('Failed to send call_ended:', err);
    }

    onOpenChange(false);
  };

  const handleMicrophoneChange = async (deviceId: string) => {
    try {
      console.log('🎙️ Switching microphone to:', deviceId);
      setSelectedMicrophone(deviceId);

      if (!localStreamRef.current || !peerConnectionRef.current) return;

      // Get new stream with selected microphone
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true, // Re-enabled to help with laptop echo
        autoGainControl: true,
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 1 },
        ...(deviceId && deviceId !== 'default' ? { deviceId: { ideal: deviceId } } : {}),
      };

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      const newAudioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];

      // Replace track in peer connection
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
      if (sender) {
        await sender.replaceTrack(newAudioTrack);
        console.log('✅ Microphone switched successfully');
      }

      // Stop old track and update stream
      oldAudioTrack?.stop();
      localStreamRef.current.removeTrack(oldAudioTrack);
      localStreamRef.current.addTrack(newAudioTrack);

      toast.success('Microphone changed');
    } catch (err) {
      console.error('❌ Failed to switch microphone:', err);
      toast.error('Failed to switch microphone');
    }
  };

  const handleSpeakerChange = async (deviceId: string) => {
    try {
      console.log('🔊 Switching speaker to:', deviceId);
      setSelectedSpeaker(deviceId);

      if (!remoteVideoRef.current) return;

      // Check if setSinkId is supported
      if ('setSinkId' in HTMLMediaElement.prototype) {
        await (remoteVideoRef.current as unknown as { setSinkId: (deviceId: string) => Promise<void> }).setSinkId(deviceId);
        console.log('✅ Speaker switched successfully');
        toast.success('Speaker changed');
      } else {
        console.warn('⚠️ setSinkId not supported in this browser');
        toast.error('Speaker selection not supported in this browser');
      }
    } catch (err) {
      console.error('❌ Failed to switch speaker:', err);
      toast.error('Failed to switch speaker');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getQualityColor = () => {
    switch (networkQuality) {
      case 'good':
        return 'bg-green-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        console.log(`🔔 Dialog onOpenChange: ${open} → ${newOpen}`);
        if (!newOpen) {
          console.warn('⚠️ Dialog trying to close! Preventing.');
          // Don't allow dialog to close itself automatically
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent
        className={`${isFullscreen ? 'max-w-full h-screen' : 'max-w-4xl'} p-0 bg-black [&>button]:hidden`}
        onPointerDownOutside={(e) => {
          console.log('🛑 Prevented pointerDownOutside');
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          console.log('🛑 Prevented interactOutside');
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          console.log('🛑 Prevented Escape key');
          e.preventDefault();
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Active {callType} call with {participantName}</DialogTitle>
          <DialogDescription>
            {isInitiator ? 'You initiated this call' : 'Incoming call'} - Duration: {formatDuration(callDuration)}
          </DialogDescription>
        </VisuallyHidden>
        <div className="relative w-full h-[600px] bg-black flex items-center justify-center">
          {/* Remote Video/Audio */}
          {hasRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              controls={false}
              className="w-full h-full object-cover"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <>
              {/* Audio element for audio-only calls - must not be muted! */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                controls={false}
                className="hidden"
                style={{ display: 'none' }}
              />
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={getAvatarUrl(participantAvatar)} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {participantName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold text-white">{participantName}</h2>
                <p className="text-sm text-gray-400">
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Connected'}
                </p>
              </div>
            </>
          )}

          {/* Local Video (Picture-in-Picture) */}
          {!isVideoOff && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-4 right-4 w-48 h-36 object-cover rounded-lg border-2 border-white shadow-lg"
            />
          )}

          {/* Header - Status Info */}
          <div className="absolute top-4 left-4 flex items-center gap-3">
            <Badge variant="secondary" className="bg-black/50 text-white">
              {connectionStatus === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
            </Badge>
            <Badge className={`${getQualityColor()} text-white`}>
              {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)} Connection
            </Badge>
          </div>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>

          {/* Device Settings Panel - Positioned above controls */}
          {showDeviceSettings && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/95 border border-gray-700 rounded-lg p-4 w-96 space-y-4 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-2">Audio Devices</h3>

              <div className="space-y-2">
                <label className="text-xs text-gray-300 font-medium">Microphone</label>
                <Select value={selectedMicrophone} onValueChange={handleMicrophoneChange}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {audioDevices
                      .filter(d => d.kind === 'audioinput')
                      .map(device => (
                        <SelectItem
                          key={device.deviceId}
                          value={device.deviceId}
                          className="text-white hover:bg-gray-700"
                        >
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-300 font-medium">Speaker</label>
                <Select value={selectedSpeaker} onValueChange={handleSpeakerChange}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select speaker" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {audioDevices
                      .filter(d => d.kind === 'audiooutput')
                      .map(device => (
                        <SelectItem
                          key={device.deviceId}
                          value={device.deviceId}
                          className="text-white hover:bg-gray-700"
                        >
                          {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            {/* Mute/Unmute */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant={isMuted ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full h-14 w-14"
                onClick={handleToggleMute}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <span className="text-xs text-white">{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>

            {/* End Call */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full h-16 w-16 bg-red-600 hover:bg-red-700"
                onClick={handleEndCall}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <span className="text-xs text-white">End</span>
            </div>

            {/* Video On/Off - Always show to allow upgrading voice calls to video */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant={isVideoOff ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full h-14 w-14"
                onClick={handleToggleVideo}
              >
                {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
              <span className="text-xs text-white">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
            </div>

            {/* Device Settings */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant={showDeviceSettings ? 'default' : 'secondary'}
                size="lg"
                className="rounded-full h-14 w-14"
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              >
                <Settings className="h-6 w-6" />
              </Button>
              <span className="text-xs text-white">Devices</span>
            </div>
          </div>

          {/* Participant Name Overlay - Positioned higher to avoid button overlap */}
          {hasRemoteVideo && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="bg-black/70 backdrop-blur-sm text-white text-base px-4 py-1.5">
                {participantName}
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
