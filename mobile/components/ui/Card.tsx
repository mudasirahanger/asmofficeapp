import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({ children, style, padding = 16 }) => (
  <View style={[styles.card, { padding }, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
});
