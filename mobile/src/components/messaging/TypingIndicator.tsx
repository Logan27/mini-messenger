import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface TypingIndicatorProps {
  color?: string;
  dotSize?: number;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  color = '#666',
  dotSize = 8,
}) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const dot1 = createDotAnimation(dot1Anim, 0);
    const dot2 = createDotAnimation(dot2Anim, 150);
    const dot3 = createDotAnimation(dot3Anim, 300);

    Animated.parallel([dot1, dot2, dot3]).start();

    return () => {
      dot1.stop();
      dot2.stop();
      dot3.stop();
    };
  }, []);

  const getDotStyle = (animValue: Animated.Value) => ({
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
    marginHorizontal: 2,
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={getDotStyle(dot1Anim)} />
      <Animated.View style={getDotStyle(dot2Anim)} />
      <Animated.View style={getDotStyle(dot3Anim)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});

export default TypingIndicator;
