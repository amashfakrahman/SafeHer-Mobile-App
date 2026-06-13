import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  error = '',
  helper = '',
  rightElement = null,
  leftIcon = null,
  returnKeyType,
  accessibilityLabel,
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      {label ? <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 8, fontSize: 14 }}>{label}</Text> : null}
      <View
        style={{
          borderWidth: 1,
          borderColor: error ? theme.colors.danger : focused ? theme.colors.primary : theme.colors.border,
          backgroundColor: theme.colors.input,
          borderRadius: theme.radius.md,
          minHeight: 52,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
        }}
      >
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={focused ? theme.colors.primary : theme.colors.textSubtle} style={{ marginRight: 8, marginTop: multiline ? 16 : 0 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSubtle}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.body,
            paddingVertical: multiline ? 14 : 0,
            minHeight: multiline ? 110 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
            fontWeight: '400',
          }}
        />
        {rightElement}
      </View>
      {error ? (
        <Text style={{ color: theme.colors.danger, marginTop: 7, fontSize: 12, fontWeight: '600' }}>{error}</Text>
      ) : helper ? (
        <Text style={{ color: theme.colors.textSubtle, marginTop: 7, fontSize: 12, lineHeight: 17 }}>{helper}</Text>
      ) : null}
    </View>
  );
}
