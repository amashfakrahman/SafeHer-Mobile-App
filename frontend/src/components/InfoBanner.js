import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';

const toneMap = {
  danger: ['danger', 'dangerSoft', 'alert-circle-outline'],
  success: ['success', 'successSoft', 'checkmark-circle-outline'],
  warning: ['warning', 'warningSoft', 'warning-outline'],
  info: ['info', 'infoSoft', 'information-circle-outline'],
};

export function InfoBanner({ title, message, tone = 'info', icon, style }) {
  const { theme } = useTheme();
  const [textKey, bgKey, defaultIcon] = toneMap[tone] || toneMap.info;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: theme.spacing.md,
          backgroundColor: theme.colors[bgKey],
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon || defaultIcon} size={19} color={theme.colors[textKey]} />
      </View>
      <View style={{ flex: 1 }}>
        {title ? <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 15 }}>{title}</Text> : null}
        {message ? <Text style={{ color: theme.colors.textMuted, lineHeight: 20, marginTop: title ? 5 : 0 }}>{message}</Text> : null}
      </View>
    </View>
  );
}
