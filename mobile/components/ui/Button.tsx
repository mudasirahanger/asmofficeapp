import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS } from '../../constants';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: COLORS.primary,  text: '#fff' },
  secondary: { bg: '#f1f5f9',       text: '#475569' },
  success:   { bg: '#10b981',       text: '#fff' },
  danger:    { bg: '#ef4444',       text: '#fff' },
  warning:   { bg: '#f59e0b',       text: '#fff' },
  ghost:     { bg: 'transparent',   text: COLORS.primary },
  outline:   { bg: 'transparent',   text: COLORS.primary, border: COLORS.primary },
};

const sizeStyles = {
  sm: { py: 6, px: 12, font: 12 },
  md: { py: 10, px: 16, font: 14 },
  lg: { py: 14, px: 20, font: 16 },
};

export const Button: React.FC<ButtonProps> = ({
  children, onPress, variant = 'primary', size = 'md',
  disabled, loading, fullWidth, style, textStyle,
}) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: disabled || loading ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text style={[{ color: v.text, fontSize: s.font, fontWeight: '600' }, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
