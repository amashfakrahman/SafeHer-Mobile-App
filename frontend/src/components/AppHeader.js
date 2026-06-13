import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';

export function AppHeader({ title, subtitle, eyebrow, onBack, rightElement = null, compact = false }) {
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: compact ? theme.spacing.md : theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: theme.radius.md,
              backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            })}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }}>
          {eyebrow ? (
            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={{ color: theme.colors.text, fontSize: compact ? 22 : theme.typography.title, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
          {subtitle ? <Text style={{ color: theme.colors.textMuted, marginTop: 5, lineHeight: 20 }}>{subtitle}</Text> : null}
        </View>
        {rightElement ? <View style={{ marginLeft: theme.spacing.md }}>{rightElement}</View> : null}
      </View>
    </View>
  );
}
