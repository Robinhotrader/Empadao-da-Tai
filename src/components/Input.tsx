import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, ...rest }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...rest}
        style={[styles.input, rest.multiline && styles.multiline, rest.style]}
        placeholderTextColor="#A38B80"
        selectionColor="#A74436"
        accessibilityLabel={rest.accessibilityLabel ?? label}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 11, marginBottom: 7, color: '#62463F', fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: '#EFE7E0',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FFFEFC',
    fontSize: 12,
    color: '#513A34',
  },
  multiline: { minHeight: 72, paddingTop: 11 },
});
