import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { PressableCard } from './Card';

export function ActionCard({ icon, title, subtitle, onPress, tone = 'primary' }) {
  const { theme } = useTheme();
  const toneMap = {
    primary: [theme.colors.primary, theme.colors.primaryTint],
    success: [theme.colors.success, theme.colors.successSoft],
    warning: [theme.colors.warning, theme.colors.warningSoft],
    info: [theme.colors.info, theme.colors.infoSoft],
  };
  const [iconColor, bgColor] = toneMap[tone] || toneMap.primary;

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${title}. ${subtitle}`}
      style={{ flex: 1, minWidth: '47%', marginBottom: theme.spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.md,
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 3, lineHeight: 18 }} numberOfLines={2}>{subtitle}</Text>
        </View>
      </View>
    </PressableCard>
  );
}
