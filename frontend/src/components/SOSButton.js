import React, { useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';

export function SOSButton({ onTrigger, disabled = false, loading = false }) {
  const { theme } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const [isPressing, setIsPressing] = useState(false);

  const startPress = () => {
    setIsPressing(true);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: false }).start();
  };

  const endPress = () => {
    setIsPressing(false);
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: false }).start();
  };

  const handleLongPress = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsPressing(false);
    onTrigger?.();
  };

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        disabled={disabled || loading}
        onPressIn={startPress}
        onPressOut={endPress}
        onLongPress={handleLongPress}
        delayLongPress={1800}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS. Long press to send alert."
        accessibilityHint="Hold for two seconds to alert trusted contacts and start live location sharing."
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        style={({ pressed }) => ({
          width: '100%',
          borderRadius: theme.radius.xl,
          backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
          paddingVertical: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Ionicons name="shield-checkmark" size={28} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontSize: 38, fontWeight: '800', letterSpacing: -0.8 }}>SOS</Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.92)', marginTop: 8, fontWeight: '600' }}>
          {loading ? 'Sending alert...' : isPressing ? 'Keep holding' : 'Hold 2 seconds'}
        </Text>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: 'rgba(255,255,255,0.24)' }}>
          <Animated.View style={{ width: progressWidth, height: 5, backgroundColor: theme.colors.white }} />
        </View>
      </Pressable>
      <Text style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.md, lineHeight: 20, maxWidth: 330 }}>
        Long press only during an emergency. Your trusted contacts can receive your live location.
      </Text>
    </View>
  );
}
