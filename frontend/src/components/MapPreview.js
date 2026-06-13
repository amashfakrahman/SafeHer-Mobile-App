import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { formatCoordinates } from '../utils/format';
import { Card } from './Card';
import { StatusPill } from './StatusPill';

export function MapPreview({ latitude, longitude, active = false, label = 'Location preview', footer = null, style }) {
  const { theme } = useTheme();
  const hasCoords = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;

  return (
    <Card elevated padding="none" style={[{ overflow: 'hidden' }, style]}>
      <View style={{ height: 188, backgroundColor: theme.colors.primaryTint, padding: theme.spacing.lg }}>
        <View style={{ position: 'absolute', left: 24, right: 24, top: 46, height: 1, backgroundColor: theme.colors.border }} />
        <View style={{ position: 'absolute', left: 24, right: 24, top: 96, height: 1, backgroundColor: theme.colors.border }} />
        <View style={{ position: 'absolute', left: 24, right: 24, top: 146, height: 1, backgroundColor: theme.colors.border }} />
        <View style={{ position: 'absolute', top: 20, bottom: 20, left: 82, width: 1, backgroundColor: theme.colors.border }} />
        <View style={{ position: 'absolute', top: 20, bottom: 20, right: 88, width: 1, backgroundColor: theme.colors.border }} />
        <View style={{ position: 'absolute', left: 54, top: 108, width: 160, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, transform: [{ rotate: '-16deg' }] }} />
        <View style={{ position: 'absolute', left: 184, top: 80, width: 74, height: 6, borderRadius: 3, backgroundColor: theme.colors.black, transform: [{ rotate: '20deg' }] }} />
        <View style={{ position: 'absolute', right: 38, top: 50, width: 62, height: 62, borderRadius: 31, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: theme.colors.surface }}>
          <Ionicons name="location" size={26} color={theme.colors.primary} />
        </View>
        <StatusPill label={active ? 'Live' : 'Ready'} tone={active ? 'success' : 'info'} icon={active ? 'radio-outline' : 'navigate-outline'} />
        <View style={{ position: 'absolute', left: theme.spacing.lg, bottom: theme.spacing.lg, right: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18 }}>{label}</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 4, fontWeight: '700' }}>{hasCoords ? formatCoordinates(latitude, longitude) : 'No location captured yet'}</Text>
        </View>
      </View>
      {footer ? <View style={{ padding: theme.spacing.lg }}>{footer}</View> : null}
    </Card>
  );
}
