import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';

export function SettingRow({ icon, title, value, onPress, danger = false, rightElement = null }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.softShadow,
      })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 20, backgroundColor: danger ? theme.colors.dangerSoft : theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md }}>
        <Ionicons name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? theme.colors.danger : theme.colors.text, fontWeight: '900', fontSize: 15 }}>{title}</Text>
        {value ? <Text style={{ color: theme.colors.textMuted, marginTop: 5, lineHeight: 19 }}>{value}</Text> : null}
      </View>
      {rightElement || (onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.textSubtle} /> : null)}
    </Pressable>
  );
}
