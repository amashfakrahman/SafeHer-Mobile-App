import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';

export function SegmentedControl({ options, value, onChange, style }) {
  const { theme } = useTheme();

  return (
    <View style={[{ flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, padding: 4, gap: 4 }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              backgroundColor: selected ? theme.colors.primary : pressed ? theme.colors.primarySoft : 'transparent',
            })}
          >
            <Text style={{ color: selected ? theme.colors.white : theme.colors.text, fontWeight: '900', fontSize: 13 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
