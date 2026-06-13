import React, { useMemo } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/AppHeader';
import { Card, PressableCard } from '../../components/Card';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

function MenuItem({ icon, title, subtitle, onPress, tone = 'primary', badge }) {
  const { theme } = useTheme();
  const toneMap = {
    primary: [theme.colors.primary, theme.colors.primaryTint],
    success: [theme.colors.success, theme.colors.successSoft],
    warning: [theme.colors.warning, theme.colors.warningSoft],
    info: [theme.colors.info, theme.colors.infoSoft],
    danger: [theme.colors.danger, theme.colors.dangerSoft],
  };
  const [iconColor, iconBg] = toneMap[tone] || toneMap.primary;

  return (
    <PressableCard onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`} style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
            {badge ? <StatusPill label={badge} tone={tone === 'danger' ? 'danger' : 'info'} /> : null}
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 4, lineHeight: 19 }}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSubtle} />
      </View>
    </PressableCard>
  );
}

function SmallMenuButton({ icon, label, onPress, tone = 'primary' }) {
  const { theme } = useTheme();
  const toneMap = {
    primary: [theme.colors.primary, theme.colors.primaryTint],
    success: [theme.colors.success, theme.colors.successSoft],
    warning: [theme.colors.warning, theme.colors.warningSoft],
    info: [theme.colors.info, theme.colors.infoSoft],
  };
  const [iconColor, iconBg] = toneMap[tone] || toneMap.primary;

  return (
    <PressableCard onPress={onPress} style={{ flex: 1, minWidth: '47%' }} padding="sm" accessibilityLabel={label}>
      <View style={{ alignItems: 'center', paddingVertical: theme.spacing.sm }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Ionicons name={icon} size={21} color={iconColor} />
        </View>
        <Text style={{ color: theme.colors.text, fontWeight: '800', textAlign: 'center' }}>{label}</Text>
      </View>
    </PressableCard>
  );
}

export function AppMenuScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const initials = useMemo(() => {
    return (user?.fullName || 'U')
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.fullName]);

  const openStackScreen = (screenName) => {
    navigation.getParent()?.navigate(screenName);
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You will need to log in again to use SafeHer.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenWrapper>
      <AppHeader eyebrow="Menu" title="SafeHer menu" subtitle="Everything is grouped in one simple place." />

      <Card elevated padding="lg" style={{ marginBottom: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 20 }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18 }}>{user?.fullName || 'SafeHer user'}</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>{user?.email || 'Account details'}</Text>
          </View>
          <StatusPill label="Active" tone="success" icon="shield-checkmark-outline" />
        </View>
      </Card>

      <SectionHeader title="Fast access" subtitle="Most used actions for emergencies and daily safety." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
        <SmallMenuButton icon="home-outline" label="Home" onPress={() => navigation.navigate('Home')} />
        <SmallMenuButton icon="location-outline" label="Live share" onPress={() => navigation.navigate('LiveShare')} tone="success" />
        <SmallMenuButton icon="people-outline" label="Contacts" onPress={() => navigation.navigate('Contacts')} tone="info" />
        <SmallMenuButton icon="create-outline" label="Report" onPress={() => openStackScreen('ReportIncident')} tone="warning" />
      </View>

      <SectionHeader title="Safety tools" subtitle="Open any SafeHer feature from this menu." />
      <MenuItem
        icon="document-text-outline"
        title="Incident reports"
        subtitle="View reports and safety map details."
        onPress={() => navigation.navigate('Incidents')}
        tone="warning"
      />
      <MenuItem
        icon="medical-outline"
        title="Help centers"
        subtitle="Find police stations, hospitals, and emergency support."
        onPress={() => openStackScreen('HelpCenters')}
        tone="info"
      />
      <MenuItem
        icon="folder-open-outline"
        title="Evidence vault"
        subtitle="Keep photo, video, and audio evidence organized."
        onPress={() => openStackScreen('EvidenceVault')}
        tone="success"
      />
      <MenuItem
        icon="chatbubbles-outline"
        title="Community"
        subtitle="Read and share anonymous safety updates."
        onPress={() => openStackScreen('Community')}
        tone="primary"
      />

      <SectionHeader title="Account" subtitle="Profile, app preferences, and sign out." style={{ marginTop: theme.spacing.lg }} />
      <MenuItem
        icon="person-outline"
        title="Profile & settings"
        subtitle="Manage your profile, theme, privacy, and alert records."
        onPress={() => openStackScreen('Profile')}
        tone="info"
      />
      <MenuItem
        icon="log-out-outline"
        title="Log out"
        subtitle="Safely end this SafeHer session."
        onPress={confirmLogout}
        tone="danger"
      />
    </ScreenWrapper>
  );
}
