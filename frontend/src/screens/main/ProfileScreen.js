import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import * as notificationsApi from '../../api/notificationsApi';
import { getApiErrorMessage } from '../../api/client';
import { AppHeader } from '../../components/AppHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { SettingRow } from '../../components/SettingRow';
import { Card } from '../../components/Card';
import { StatusPill } from '../../components/StatusPill';
import { InfoBanner } from '../../components/InfoBanner';
import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/date';

const themeOptions = ['light', 'dark', 'system'];

export function ProfileScreen({ navigation }) {
  const { user, logout, updateSettings, isSubmitting, sessionWarning } = useAuth();
  const { theme, themePreference, setThemePreference } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const initials = useMemo(
    () =>
      (user?.fullName || 'U')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    [user?.fullName]
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const nextNotifications = await notificationsApi.getNotifications();
      setNotifications(nextNotifications.slice(0, 5));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const changeTheme = async (value) => {
    try {
      await setThemePreference(value);
      await updateSettings({ themePreference: value });
    } catch (error) {
      Alert.alert('Theme update failed', getApiErrorMessage(error));
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You will need to log in again to access emergency tools linked to this account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor={theme.colors.primary} />}>
      <AppHeader eyebrow="Settings" title="Profile" subtitle="Manage account identity, appearance, and alert records." onBack={navigation?.goBack} />

      {sessionWarning ? <InfoBanner tone="warning" message={sessionWarning} style={{ marginBottom: theme.spacing.lg }} /> : null}

      <Card elevated padding="xl" style={{ backgroundColor: theme.colors.primary, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -44, top: -44, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.lg }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 26 }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 23, letterSpacing: -0.3 }}>{user?.fullName}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: 5 }}>{user?.email}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>{user?.phone}</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Appearance" subtitle="Choose a comfortable visual mode." style={{ marginTop: theme.spacing.xl }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {themeOptions.map((option) => {
          const selected = themePreference === option;
          return (
            <Pressable
              key={option}
              onPress={() => changeTheme(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 13,
                borderRadius: theme.radius.pill,
                backgroundColor: selected ? theme.colors.primary : pressed ? theme.colors.primarySoft : theme.colors.surface,
                borderWidth: 1,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                alignItems: 'center',
                ...theme.softShadow,
              })}
            >
              <Text style={{ color: selected ? theme.colors.white : theme.colors.text, fontWeight: '900', textTransform: 'capitalize' }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Safety settings" subtitle="Privacy, permissions, and sync controls." style={{ marginTop: theme.spacing.xl }} />
      <View>
        <SettingRow
          icon="shield-checkmark-outline"
          title="Privacy & permissions"
          value="Location and photo access are requested only at the moment an existing safety flow needs them."
          onPress={() => Alert.alert('Privacy & permissions', 'SafeHer requests location for SOS, live sharing, nearby help centers, and optional incident context. Photo access is used only when you attach image evidence.')}
        />
        <SettingRow
          icon="notifications-outline"
          title="Alert records"
          value="Safety alert records are stored in the backend. Native delivery providers can be connected for public launch without changing the SOS flow."
          onPress={() => Alert.alert('Alert records', 'SafeHer records SOS confirmations and trusted-contact delivery states. Public launch delivery should use approved native/SMS/email providers configured on the backend.')}
        />
        <SettingRow
          icon="refresh-outline"
          title="Sync appearance"
          value={isSubmitting ? 'Saving your preference...' : 'Save the selected theme to your backend profile.'}
          onPress={() => changeTheme(themePreference)}
        />
      </View>

      <SectionHeader title="Recent alerts" subtitle="Latest backend notification records for this account." style={{ marginTop: theme.spacing.lg }} />
      {loadError ? <InfoBanner tone="warning" message={loadError} style={{ marginBottom: theme.spacing.md }} /> : null}
      {notifications.length === 0 ? (
        <Card>
          <Text style={{ color: theme.colors.text, fontWeight: '900' }}>No alert records yet</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 20 }}>SOS confirmations and trusted-contact alert records will appear here.</Text>
        </Card>
      ) : notifications.map((item) => (
        <Card key={item.id} elevated style={{ marginBottom: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', flex: 1 }}>{item.title}</Text>
            <StatusPill label={item.channel} tone={item.channel === 'sos' ? 'danger' : 'info'} />
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 7, lineHeight: 20 }}>{item.body}</Text>
          <Text style={{ color: theme.colors.textSubtle, marginTop: 8 }}>{formatDateTime(item.created_at)}</Text>
        </Card>
      ))}

      <PrimaryButton
        title="Log out"
        variant="secondary"
        icon={<Ionicons name="log-out-outline" size={18} color={theme.colors.text} />}
        onPress={confirmLogout}
        style={{ marginTop: theme.spacing.md }}
      />
    </ScreenWrapper>
  );
}
