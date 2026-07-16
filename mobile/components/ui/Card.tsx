import React, { useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  padding?: number;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({ children, style, className, padding = 16, delay = 0 }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style as any]}>
      <View 
        style={{ padding }}
        className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm ${className || ''}`}
      >
        {children}
      </View>
    </Animated.View>
  );
};
