import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { Card } from './Card';
import { StatusPill } from './StatusPill';

export function TrustedContactCard({ contact, onEdit, onDelete, compact = false }) {
  const { theme } = useTheme();
  const initials = (contact.name || 'C').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Card elevated style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md }}>
          <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 18 }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 17 }}>{contact.name}</Text>
            {contact.is_primary ? <StatusPill label="Primary" tone="danger" icon="star" /> : null}
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>{contact.relationship || 'Trusted contact'}</Text>
          {contact.phone ? <Text style={{ color: theme.colors.text, marginTop: 10, fontWeight: '900' }}>{contact.phone}</Text> : null}
          {!compact && contact.email ? <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>{contact.email}</Text> : null}
          {!compact && contact.notes ? <Text style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 19 }}>{contact.notes}</Text> : null}
        </View>
      </View>

      {!compact ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.lg }}>
          {contact.phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${contact.phone}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingRight: 10 }} accessibilityRole="button">
              <Ionicons name="call-outline" size={18} color={theme.colors.success} />
              <Text style={{ color: theme.colors.success, fontWeight: '900' }}>Call</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => onEdit(contact)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingRight: 10 }} accessibilityRole="button">
            <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => onDelete(contact)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 }} accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            <Text style={{ color: theme.colors.danger, fontWeight: '900' }}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
