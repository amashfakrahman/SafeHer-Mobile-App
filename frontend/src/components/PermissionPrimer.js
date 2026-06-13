import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { Card } from './Card';

export function PermissionPrimer({ icon = 'lock-closed-outline', title, body, points = [] }) {
  const { theme } = useTheme();

  return (
    <Card style={{ marginBottom: theme.spacing.lg, backgroundColor: theme.colors.primaryTint }} elevated>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={23} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>{body}</Text>
          {points.map((point) => (
            <View key={point} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 9, gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} style={{ marginTop: 1 }} />
              <Text style={{ color: theme.colors.textMuted, flex: 1, lineHeight: 19 }}>{point}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
