import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { useCallStore } from '../../stores/callStore';
import { webrtcService } from '../../services/webrtcService';
import { sendMuteStatus, sendVideoToggleStatus } from '../../services/callWebSocketHandler';
import { Call } from '../../types';

const { width, height } = Dimensions.get('window');

interface ActiveCallScreenProps {
  route: any;
  navigation: any;
}

const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { call } = route.params as { call: Call };
  const {
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    isSpeakerEnabled,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    endCall,
    activeCall,
  } = useCallStore();

  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    // Start call duration timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Listen for call end
    const checkCallStatus = setInterval(() => {
      const currentCall = useCallStore.getState().activeCall;
      if (!currentCall || currentCall.status === 'ended') {
        handleCallEnded();
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(checkCallStatus);
    };
  }, []);

  const handleEndCall = async () => {
    try {
      await endCall();
      webrtcService.cleanup();
      navigation.goBack();
    } catch (error) {
      console.error('Failed to end call:', error);
      navigation.goBack();
    }
  };

  const handleCallEnded = () => {
    webrtcService.cleanup();
    navigation.goBack();
  };

  const handleToggleMute = () => {
    toggleMute();
    if (activeCall) {
      sendMuteStatus(activeCall.id, !isMuted);
    }
  };

  const handleToggleVideo = () => {
    toggleVideo();
    if (activeCall) {
      sendVideoToggleStatus(activeCall.id, !isVideoEnabled);
    }
  };

  const handleToggleSpeaker = () => {
    toggleSpeaker();
  };

  const handleSwitchCamera = async () => {
    try {
      await webrtcService.switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const otherParticipant =
    activeCall?.callerId === call.callerId ? call.recipient : call.caller;
  const participantName = otherParticipant?.name || 'Unknown';
  const participantAvatar = otherParticipant?.avatar || otherParticipant?.profilePicture;
  const isVideoCall = call.callType === 'video';

  return (
    <View style={styles.container}>
      {/* Remote video stream (full screen) */}
      {isVideoCall && remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={styles.audioCallContainer}>
          <View style={styles.backgroundGradient} />
          {participantAvatar ? (
            <Image source={{ uri: participantAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={80} color="#fff" />
            </View>
          )}
        </View>
      )}

      {/* Local video stream (small preview in corner) */}
      {isVideoCall && isVideoEnabled && localStream && (
        <View style={[styles.localVideoContainer, { top: insets.top + 20 }]}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}

      {/* Call info overlay */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.participantName}>{participantName}</Text>
        <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
      </View>

      {/* Control buttons */}
      {showControls && (
        <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.controlsRow}>
            {/* Mute button */}
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={handleToggleMute}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            {/* Video toggle button (only for video calls) */}
            {isVideoCall && (
              <TouchableOpacity
                style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                onPress={handleToggleVideo}
              >
                <Ionicons
                  name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                  size={28}
                  color="#fff"
                />
              </TouchableOpacity>
            )}

            {/* Speaker button */}
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerEnabled && styles.controlButtonActive]}
              onPress={handleToggleSpeaker}
            >
              <Ionicons
                name={isSpeakerEnabled ? 'volume-high' : 'volume-medium'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            {/* Switch camera button (only for video calls) */}
            {isVideoCall && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleSwitchCamera}
              >
                <Ionicons name="camera-reverse" size={28} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* End call button */}
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={32} color="#fff" style={styles.endCallIcon} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tap to toggle controls */}
      <TouchableOpacity
        style={styles.tapArea}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  audioCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#16213e',
    opacity: 0.9,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#4a5568',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoContainer: {
    position: 'absolute',
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  participantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  callDuration: {
    fontSize: 14,
    color: '#cbd5e0',
    marginBottom: 10,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#e53e3e',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e53e3e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
  tapArea: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 200,
  },
});

export default ActiveCallScreen;
