import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { initials, avatarColor } from '../../utils';
import { User } from '../../types';

interface AvatarProps {
  user?: User | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { dim: 28, font: 11 },
  md: { dim: 36, font: 13 },
  lg: { dim: 48, font: 16 },
};

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md' }) => {
  const { dim, font } = sizes[size];
  const color = avatarColor(user?.id);
  const text  = initials(user?.name);

  return (
    <View style={[styles.container, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: color }]}>
      <Text style={[styles.text, { fontSize: font }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
