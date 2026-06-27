import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  bg: string;
  text: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ label, bg, text, dot }) => (
  <View style={[styles.badge, { backgroundColor: bg }]}>
    {dot && <View style={[styles.dot, { backgroundColor: text }]} />}
    <Text style={[styles.text, { color: text }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
