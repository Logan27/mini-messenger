import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Vibration,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallStore } from '../../stores/callStore';
import { webrtcService } from '../../services/webrtcService';
import { Call } from '../../types';

const { width, height } = Dimensions.get('window');

interface IncomingCallScreenProps {
  route: any;
  navigation: any;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { call } = route.params as { call: Call };
  const { acceptCall, rejectCall } = useCallStore();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Vibrate to notify user of incoming call
    const vibrationPattern = [0, 1000, 500, 1000];
    Vibration.vibrate(vibrationPattern, true);

    // Play ringtone (you can add custom ringtone here)
    // TODO: Add ringtone sound

    return () => {
      Vibration.cancel();
    };
  }, []);

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Initialize local media stream
      await webrtcService.initializeLocalStream(call.callType === 'video');

      // Accept the call via API
      await acceptCall(call.id);

      // Navigate to active call screen
      navigation.replace('ActiveCall', { call });
    } catch (error) {
      console.error('Failed to accept call:', error);
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await rejectCall(call.id);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to reject call:', error);
      setIsProcessing(false);
    }
  };

  const callerName = call.caller?.name || 'Unknown';
  const callerAvatar = call.caller?.avatar || call.caller?.profilePicture;
  const isVideoCall = call.callType === 'video';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />

      {/* Caller info */}
      <View style={styles.callerInfoContainer}>
        {callerAvatar ? (
          <Image source={{ uri: callerAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={80} color="#fff" />
          </View>
        )}

        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callType}>
          {isVideoCall ? 'Video Call' : 'Voice Call'}
        </Text>
        <Text style={styles.callStatus}>Incoming...</Text>
      </View>

      {/* Action buttons */}
      <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + 40 }]}>
        {/* Reject button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={isProcessing}
        >
          <Ionicons name="close" size={40} color="#fff" />
          <Text style={styles.actionLabel}>Decline</Text>
        </TouchableOpacity>

        {/* Accept button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={handleAccept}
          disabled={isProcessing}
        >
          <Ionicons
            name={isVideoCall ? 'videocam' : 'call'}
            size={40}
            color="#fff"
          />
          <Text style={styles.actionLabel}>Accept</Text>
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
  callerInfoContainer: {
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
  callerName: {
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
  callStatus: {
    fontSize: 16,
    color: '#cbd5e0',
    marginTop: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 60,
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
  rejectButton: {
    backgroundColor: '#e53e3e',
  },
  acceptButton: {
    backgroundColor: '#48bb78',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
});

export default IncomingCallScreen;
