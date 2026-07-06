import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useThemeStore } from '../../store/themeStore';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 20, borderRadius = 4, style }) => {
  const opacity = useSharedValue(0.3);
  const { theme } = useThemeStore();

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const backgroundColor = theme === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const SkeletonProjectCard = () => {
  const { theme } = useThemeStore();
  const bgColor = theme === 'dark' ? '#1e293b' : '#ffffff';
  const borderColor = theme === 'dark' ? '#334155' : '#f1f5f9';

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.header}>
        <Skeleton width={150} height={24} borderRadius={6} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
      <Skeleton width="100%" height={16} borderRadius={4} style={{ marginTop: 12 }} />
      <Skeleton width="80%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
      <View style={styles.footer}>
        <View style={styles.avatars}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={32} height={32} borderRadius={16} style={{ marginLeft: -8 }} />
        </View>
        <Skeleton width={100} height={16} borderRadius={4} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  avatars: {
    flexDirection: 'row',
  }
});
