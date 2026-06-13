import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../constants/storage';
import { buildTheme, getNavigationTheme } from '../constants/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme() || 'light';
  const [themePreference, setThemePreferenceState] = useState('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(STORAGE_KEYS.themePreference);
        if (mounted && storedPreference) {
          setThemePreferenceState(storedPreference);
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedMode = themePreference === 'system' ? systemColorScheme : themePreference;
  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);
  const navigationTheme = useMemo(() => getNavigationTheme(resolvedMode), [resolvedMode]);

  const setThemePreference = useCallback(async (value, persist = true) => {
    setThemePreferenceState(value);
    if (persist) {
      await AsyncStorage.setItem(STORAGE_KEYS.themePreference, value);
    }
  }, []);

  const value = useMemo(() => ({
    isReady,
    theme,
    navigationTheme,
    themePreference,
    resolvedMode,
    setThemePreference,
  }), [isReady, navigationTheme, resolvedMode, setThemePreference, theme, themePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
