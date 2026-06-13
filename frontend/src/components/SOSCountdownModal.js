import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { PrimaryButton } from './PrimaryButton';

export function SOSCountdownModal({ visible, seconds = 3, source = 'button', silentMode = false, onCancel, onConfirm }) {
  const { theme } = useTheme();
  const [remaining, setRemaining] = useState(seconds);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return undefined;
    setRemaining(seconds);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 360, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 360, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, seconds, visible]);

  useEffect(() => {
    if (!visible) return undefined;
    if (remaining <= 0) {
      onConfirm?.();
      return undefined;
    }
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [onConfirm, remaining, visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.xl }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.xxl, padding: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow }}>
          <View style={{ alignItems: 'center' }}>
            <Animated.View style={{ width: 118, height: 118, borderRadius: 59, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulse }], borderWidth: 8, borderColor: theme.colors.primarySoft }}>
              <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 46 }}>{remaining}</Text>
            </Animated.View>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 24, marginTop: theme.spacing.lg, textAlign: 'center' }}>SOS sending in {remaining}s</Text>
            <Text style={{ color: theme.colors.textMuted, lineHeight: 21, textAlign: 'center', marginTop: 8 }}>
              {source === 'shake' ? 'Shake trigger detected.' : 'SOS button confirmed.'} You can cancel now if this was accidental.
            </Text>
          </View>

          <View style={{ marginTop: theme.spacing.lg, backgroundColor: silentMode ? theme.colors.warningSoft : theme.colors.primaryTint, borderRadius: theme.radius.lg, padding: theme.spacing.md, flexDirection: 'row', gap: 10 }}>
            <Ionicons name={silentMode ? 'volume-mute-outline' : 'chatbubble-ellipses-outline'} size={20} color={silentMode ? theme.colors.warning : theme.colors.primary} />
            <Text style={{ flex: 1, color: theme.colors.textMuted, lineHeight: 20, fontWeight: '700' }}>
              {silentMode ? 'Silent SOS is on: SafeHer will avoid opening call or SMS screens and will keep the alert quiet.' : 'SafeHer will save the SOS, share live GPS, prepare emergency SMS, and open the primary contact call intent.'}
            </Text>
          </View>

          <PrimaryButton title="Send SOS now" onPress={onConfirm} style={{ marginTop: theme.spacing.lg }} />
          <Pressable onPress={onCancel} accessibilityRole="button" style={({ pressed }) => ({ marginTop: theme.spacing.md, borderRadius: theme.radius.pill, paddingVertical: 16, alignItems: 'center', backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent', borderWidth: 1, borderColor: theme.colors.border })}>
            <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Cancel false alarm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
