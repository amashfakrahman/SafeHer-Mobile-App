import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { Card } from './Card';

export function StatCard({ label, value, helper, tone = 'neutral' }) {
  const { theme } = useTheme();
  const valueColor = tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : tone === 'info' ? theme.colors.info : theme.colors.text;

  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: valueColor, fontSize: 28, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 }}>{value}</Text>
      {helper ? <Text style={{ color: theme.colors.textMuted, marginTop: 5, lineHeight: 18 }}>{helper}</Text> : null}
    </Card>
  );
}
