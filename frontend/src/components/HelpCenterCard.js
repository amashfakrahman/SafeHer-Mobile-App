import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { formatDistance } from '../utils/format';
import { Card } from './Card';
import { StatusPill } from './StatusPill';

export function HelpCenterCard({ center }) {
  const { theme } = useTheme();

  const openMaps = () => {
    const query = encodeURIComponent(`${center.latitude},${center.longitude}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const callCenter = () => {
    Linking.openURL(`tel:${center.phone}`);
  };

  const isPolice = center.type === 'police';

  return (
    <Card elevated style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ width: 58, height: 58, borderRadius: 24, backgroundColor: isPolice ? theme.colors.infoSoft : theme.colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={isPolice ? 'shield-checkmark-outline' : 'medical-outline'} size={25} color={isPolice ? theme.colors.info : theme.colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 17, flex: 1 }}>{center.name}</Text>
            <StatusPill label={center.type} tone={isPolice ? 'info' : 'success'} />
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 20 }}>{center.address}</Text>
          <Text style={{ color: theme.colors.textSubtle, marginTop: 3 }}>{center.city}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{center.phone}</Text>
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 5 }}>{formatDistance(center.distanceKm)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: theme.spacing.lg }}>
        <Pressable onPress={callCenter} accessibilityRole="button" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: theme.radius.pill, backgroundColor: theme.colors.successSoft }}>
          <Ionicons name="call-outline" size={18} color={theme.colors.success} />
          <Text style={{ color: theme.colors.success, fontWeight: '900' }}>Call</Text>
        </Pressable>
        <Pressable onPress={openMaps} accessibilityRole="button" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }}>
          <Ionicons name="navigate-outline" size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>Maps</Text>
        </Pressable>
      </View>
    </Card>
  );
}
