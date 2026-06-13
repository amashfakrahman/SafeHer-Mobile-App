import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon = null,
  variant = 'primary',
  style,
  textStyle,
  accessibilityLabel,
}) {
  const { theme } = useTheme();

  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';
  const backgroundColor = isGhost ? 'transparent' : isSecondary ? theme.colors.surface : isDanger ? theme.colors.danger : theme.colors.primary;
  const pressedColor = isGhost ? theme.colors.surfaceAlt : isSecondary ? theme.colors.surfaceAlt : isDanger ? theme.colors.primaryPressed : theme.colors.primaryPressed;
  const textColor = isGhost ? theme.colors.primary : isSecondary ? theme.colors.text : theme.colors.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.55 : 1,
          backgroundColor: pressed ? pressedColor : backgroundColor,
          borderRadius: theme.radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          minHeight: 50,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          borderWidth: isSecondary ? 1 : 0,
          borderColor: isSecondary ? theme.colors.border : 'transparent',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text style={[{ color: textColor, fontSize: 15, fontWeight: '700' }, textStyle]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
