import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OfflineBannerProps {
  pendingCount?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ pendingCount = 0 }) => (
  <View style={styles.banner}>
    <Text style={styles.icon}>📡</Text>
    <Text style={styles.text}>
      Offline mode{pendingCount > 0 ? ` · ${pendingCount} pending sync` : ''}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  icon: { fontSize: 14 },
  text: { fontSize: 12, fontWeight: '600', color: '#92400e' },
});
