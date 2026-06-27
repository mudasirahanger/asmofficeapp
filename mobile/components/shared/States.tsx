import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants';

interface LoadingStateProps {
  message?: string;
}
export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.text}>{message}</Text>
  </View>
);

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: string;
}
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  subtitle,
  icon = '📭',
}) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}
export const ErrorState: React.FC<ErrorStateProps> = ({ message = 'Something went wrong', onRetry }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>⚠️</Text>
    <Text style={styles.title}>{message}</Text>
    {onRetry && (
      <Text onPress={onRetry} style={styles.retry}>Tap to retry</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  icon:     { fontSize: 40, marginBottom: 8 },
  title:    { fontSize: 15, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  text:     { fontSize: 14, color: '#94a3b8', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  retry:    { fontSize: 13, color: '#6366f1', fontWeight: '600', marginTop: 8 },
});
