import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';

export function StatusPill({ label, tone = 'neutral', style }) {
  const { theme } = useTheme();
  const toneMap = {
    success: [theme.colors.success, theme.colors.successSoft],
    danger: [theme.colors.danger, theme.colors.dangerSoft],
    warning: [theme.colors.warning, theme.colors.warningSoft],
    info: [theme.colors.info, theme.colors.infoSoft],
    neutral: [theme.colors.textMuted, theme.colors.surfaceAlt],
  };
  const [color, backgroundColor] = toneMap[tone] || toneMap.neutral;

  return (
    <View style={[{ alignSelf: 'flex-start', backgroundColor, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 }, style]}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
