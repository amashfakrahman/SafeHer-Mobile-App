import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';

export function InlineLoader({ label = 'Loading...' }) {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xl }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
      <Text style={{ color: theme.colors.textMuted, marginTop: theme.spacing.sm, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
