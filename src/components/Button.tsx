import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';

interface ButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  color?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, color = '#D97706', disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: color }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  text: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
