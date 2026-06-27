import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => (
  <View>
    {label && (
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    )}
    <TextInput
      style={[styles.input, error ? styles.inputError : undefined, style]}
      placeholderTextColor="#94a3b8"
      {...props}
    />
    {error && <Text style={styles.error}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  error: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
  },
});
