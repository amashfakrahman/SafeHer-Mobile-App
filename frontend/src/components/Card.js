import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';

function getPadding(theme, padding) {
  if (padding === 'none') return 0;
  if (typeof padding === 'number') return padding;
  return theme.spacing[padding] || theme.spacing.md;
}

export function Card({ children, style, padding = 'md', elevated = false, accessible, accessibilityLabel }) {
  const { theme } = useTheme();

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: getPadding(theme, padding),
        },
        elevated ? theme.softShadow : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PressableCard({ children, style, padding = 'md', onPress, disabled = false, accessibilityLabel }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: pressed ? theme.colors.borderStrong : theme.colors.border,
          padding: getPadding(theme, padding),
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
