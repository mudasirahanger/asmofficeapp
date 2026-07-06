import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUIStore } from '../../store/uiStore';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

const COLORS_MAP = {
  success: { bg: '#10b981', text: '#ffffff', icon: '✅' },
  error:   { bg: '#ef4444', text: '#ffffff', icon: '❌' },
  warning: { bg: '#f59e0b', text: '#ffffff', icon: '⚠️' },
  info:    { bg: '#3b82f6', text: '#ffffff', icon: 'ℹ️' },
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { pointerEvents: 'none' as any }]}>
      {toasts.map((toast) => {
        const c = COLORS_MAP[toast.type];
        return (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.springify().damping(15)}
            exiting={FadeOutUp}
            style={[styles.toast, { backgroundColor: c.bg }]}
          >
            <Text style={styles.icon}>{c.icon}</Text>
            <Text style={[styles.message, { color: c.text }]}>{toast.message}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: { fontSize: 18 },
  message: { fontSize: 14, fontWeight: '700', flex: 1 },
});
