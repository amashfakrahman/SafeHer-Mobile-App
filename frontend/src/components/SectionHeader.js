import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';

export function SectionHeader({ title, subtitle, rightElement = null, style }) {
  const { theme } = useTheme();

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: theme.spacing.md, marginTop: theme.spacing.sm }, style]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
        {subtitle ? <Text style={{ color: theme.colors.textMuted, marginTop: 3, lineHeight: 18 }}>{subtitle}</Text> : null}
      </View>
      {rightElement}
    </View>
  );
}
