import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallStore } from '../../stores/callStore';
import { webrtcService } from '../../services/webrtcService';
import { Call } from '../../types';

interface OutgoingCallScreenProps {
  route: any;
  navigation: any;
}

const OutgoingCallScreen: React.FC<OutgoingCallScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { call } = route.params as { call: Call };
  const { endCall, activeCall } = useCallStore();
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    // Initialize local stream and create WebRTC offer
    initializeCall();

    // Listen for call status changes
    const checkCallStatus = setInterval(() => {
      const currentCall = useCallStore.getState().activeCall;
      if (currentCall) {
        if (currentCall.status === 'connected') {
          setIsConnecting(false);
          navigation.replace('ActiveCall', { call: currentCall });
        } else if (currentCall.status === 'rejected') {
          handleCallEnded('Call was declined');
        } else if (currentCall.status === 'ended') {
          handleCallEnded('Call ended');
        }
      }
    }, 500);

    // Timeout after 60 seconds
    const timeout = setTimeout(() => {
      if (isConnecting) {
        handleCallEnded('No answer');
      }
    }, 60000);

    return () => {
      clearInterval(checkCallStatus);
      clearTimeout(timeout);
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Initialize local media stream
      await webrtcService.initializeLocalStream(call.callType === 'video');

      // Create peer connection and offer
      await webrtcService.createOffer(call.id, call.recipientId);
    } catch (error) {
      console.error('Failed to initialize call:', error);
      handleCallEnded('Failed to connect');
    }
  };

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

  const handleCallEnded = (reason: string) => {
    webrtcService.cleanup();
    // You could show an alert with the reason
    navigation.goBack();
  };

  const recipientName = call.recipient?.name || 'Unknown';
  const recipientAvatar = call.recipient?.avatar || call.recipient?.profilePicture;
  const isVideoCall = call.callType === 'video';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />

      {/* Recipient info */}
      <View style={styles.recipientInfoContainer}>
        {recipientAvatar ? (
          <Image source={{ uri: recipientAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={80} color="#fff" />
          </View>
        )}

        <Text style={styles.recipientName}>{recipientName}</Text>
        <Text style={styles.callType}>
          {isVideoCall ? 'Video Call' : 'Voice Call'}
        </Text>

        {isConnecting ? (
          <View style={styles.connectingContainer}>
            <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
            <Text style={styles.callStatus}>Calling...</Text>
          </View>
        ) : (
          <Text style={styles.callStatus}>Connecting...</Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + 40 }]}>
        {/* End call button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={40} color="#fff" style={styles.endCallIcon} />
          <Text style={styles.actionLabel}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  recipientInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 30,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#4a5568',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  callType: {
    fontSize: 18,
    color: '#a0aec0',
    marginBottom: 5,
  },
  connectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  spinner: {
    marginRight: 8,
  },
  callStatus: {
    fontSize: 16,
    color: '#cbd5e0',
    marginTop: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  endCallButton: {
    backgroundColor: '#e53e3e',
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
});

export default OutgoingCallScreen;
