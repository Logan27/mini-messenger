import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  color?: string;
  size?: number;
}

const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  color = 'rgba(255, 255, 255, 0.7)',
  size = 16,
}) => {
  const renderStatusIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <Ionicons name="time-outline" size={size} color={color} />
        );
      case 'sent':
        return (
          <Ionicons name="checkmark" size={size} color={color} />
        );
      case 'delivered':
        return (
          <View style={styles.doubleCheck}>
            <Ionicons name="checkmark" size={size} color={color} style={styles.check1} />
            <Ionicons name="checkmark" size={size} color={color} style={styles.check2} />
          </View>
        );
      case 'read':
        return (
          <View style={styles.doubleCheck}>
            <Ionicons name="checkmark" size={size} color="#10b981" style={styles.check1} />
            <Ionicons name="checkmark" size={size} color="#10b981" style={styles.check2} />
          </View>
        );
      case 'failed':
        return (
          <Ionicons name="alert-circle" size={size} color="#ef4444" />
        );
      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderStatusIcon()}</View>;
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
  },
  doubleCheck: {
    flexDirection: 'row',
    position: 'relative',
    width: 18,
  },
  check1: {
    position: 'absolute',
    left: 0,
  },
  check2: {
    position: 'absolute',
    left: 6,
  },
});

export default MessageStatusIndicator;
