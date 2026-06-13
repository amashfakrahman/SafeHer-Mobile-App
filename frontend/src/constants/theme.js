import { Platform } from 'react-native';

const white = '#FFFFFF';
const black = '#111827';

export const palette = {
  light: {
    background: '#F8FAFC',
    backgroundAlt: '#F1F5F9',
    surface: white,
    surfaceAlt: '#F8FAFC',
    surfaceElevated: white,
    primary: '#E11D48',
    primaryPressed: '#BE123C',
    primarySoft: '#FFE4E6',
    primaryTint: '#FFF1F2',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    success: '#16A34A',
    successSoft: '#DCFCE7',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    info: '#2563EB',
    infoSoft: '#DBEAFE',
    text: '#0F172A',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    input: white,
    overlay: 'rgba(15, 23, 42, 0.52)',
    shadow: 'rgba(15, 23, 42, 0.08)',
    white,
    black,
    cardOverlay: '#F8FAFC',
    bottomBar: white,
  },
  dark: {
    background: '#020617',
    backgroundAlt: '#0F172A',
    surface: '#111827',
    surfaceAlt: '#1F2937',
    surfaceElevated: '#111827',
    primary: '#FB7185',
    primaryPressed: '#F43F5E',
    primarySoft: 'rgba(251, 113, 133, 0.16)',
    primaryTint: 'rgba(251, 113, 133, 0.08)',
    danger: '#F87171',
    dangerSoft: 'rgba(248, 113, 113, 0.16)',
    success: '#4ADE80',
    successSoft: 'rgba(74, 222, 128, 0.16)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.16)',
    info: '#60A5FA',
    infoSoft: 'rgba(96, 165, 250, 0.16)',
    text: '#F8FAFC',
    textMuted: '#CBD5E1',
    textSubtle: '#94A3B8',
    border: '#334155',
    borderStrong: '#475569',
    input: '#0F172A',
    overlay: 'rgba(2, 6, 23, 0.72)',
    shadow: 'rgba(0, 0, 0, 0.32)',
    white,
    black,
    cardOverlay: 'rgba(148, 163, 184, 0.08)',
    bottomBar: '#0F172A',
  },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

const typography = {
  display: 32,
  title: 25,
  headline: 20,
  subtitle: 17,
  body: 15,
  caption: 13,
  tiny: 11,
  family: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
};

export function buildTheme(mode = 'light') {
  const colors = palette[mode] || palette.light;
  return {
    mode,
    colors,
    spacing,
    radius,
    typography,
    shadow: {
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: mode === 'dark' ? 0 : 4,
    },
    softShadow: {
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: mode === 'dark' ? 0 : 2,
    },
    hairline: {
      borderWidth: 1,
      borderColor: colors.border,
    },
  };
}

export function getNavigationTheme(mode) {
  const colors = palette[mode] || palette.light;
  return {
    dark: mode === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: { fontFamily: typography.family, fontWeight: '400' },
      medium: { fontFamily: typography.family, fontWeight: '600' },
      bold: { fontFamily: typography.family, fontWeight: '700' },
      heavy: { fontFamily: typography.family, fontWeight: '800' },
    },
  };
}
