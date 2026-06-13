import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BrandMark } from './BrandMark';
import { useTheme } from '../hooks/useTheme';

export function LoadingScreen({ message = 'Loading SafeHer...' }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, padding: theme.spacing.xl }}>
      <BrandMark size="lg" subtitle="Simple safety tools for everyday travel." />
      <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing.xl }} />
      <Text style={{ marginTop: theme.spacing.md, color: theme.colors.textMuted, fontSize: theme.typography.body, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
