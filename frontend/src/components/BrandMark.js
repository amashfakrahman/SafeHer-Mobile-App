import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';

export function BrandMark({ size = 'md', inverted = false, showText = true, subtitle = null }) {
  const { theme } = useTheme();
  const iconSize = size === 'lg' ? 64 : 44;
  const iconColor = inverted ? theme.colors.primary : theme.colors.white;
  const bgColor = inverted ? theme.colors.white : theme.colors.primary;

  return (
    <View style={{ alignItems: showText ? 'center' : 'flex-start' }}>
      <View
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: theme.radius.lg,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="shield-checkmark" size={size === 'lg' ? 30 : 22} color={iconColor} />
      </View>
      {showText ? (
        <>
          <Text style={{ color: inverted ? theme.colors.white : theme.colors.text, fontSize: size === 'lg' ? 32 : 24, fontWeight: '800', marginTop: 12, letterSpacing: -0.5 }}>SafeHer</Text>
          {subtitle ? <Text style={{ color: inverted ? 'rgba(255,255,255,0.86)' : theme.colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 21 }}>{subtitle}</Text> : null}
        </>
      ) : null}
    </View>
  );
}
