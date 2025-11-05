import React from 'react';
import { View, StyleSheet } from 'react-native';

interface OnlineStatusBadgeProps {
  isOnline: boolean;
  size?: number;
  style?: any;
}

const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({
  isOnline,
  size = 12,
  style,
}) => {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isOnline ? '#10b981' : '#6b7280',
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default OnlineStatusBadge;
