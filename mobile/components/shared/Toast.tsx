import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useUIStore } from '../../store/uiStore';

const COLORS_MAP = {
  success: { bg: '#d1fae5', text: '#065f46', icon: '✅' },
  error:   { bg: '#fee2e2', text: '#b91c1c', icon: '❌' },
  warning: { bg: '#fef3c7', text: '#92400e', icon: '⚠️' },
  info:    { bg: '#dbeafe', text: '#1d4ed8', icon: 'ℹ️' },
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { pointerEvents: 'none' as any }]}>
      {toasts.map((toast) => {
        const c = COLORS_MAP[toast.type];
        return (
          <View key={toast.id} style={[styles.toast, { backgroundColor: c.bg }]}>
            <Text style={styles.icon}>{c.icon}</Text>
            <Text style={[styles.message, { color: c.text }]}>{toast.message}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  icon: { fontSize: 16 },
  message: { fontSize: 13, fontWeight: '600', flex: 1 },
});
