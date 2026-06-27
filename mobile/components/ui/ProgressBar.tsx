import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  value: number; // 0-100
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, showLabel = true }) => {
  const v = Math.min(100, Math.max(0, value || 0));
  const color =
    v === 100 ? '#10b981' :
    v > 60    ? '#6366f1' :
    v > 30    ? '#f59e0b' : '#ef4444';

  return (
    <View>
      {showLabel && (
        <View style={styles.header}>
          <Text style={styles.label}>Progress</Text>
          <Text style={[styles.value, { color }]}>{v}%</Text>
        </View>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${v}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
