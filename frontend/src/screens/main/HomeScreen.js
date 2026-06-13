import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import * as contactsApi from '../../api/contactsApi';
import * as incidentsApi from '../../api/incidentsApi';
import * as locationApi from '../../api/locationApi';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { ActionCard } from '../../components/ActionCard';
import { SOSButton } from '../../components/SOSButton';
import { SOSCountdownModal } from '../../components/SOSCountdownModal';
import { StatCard } from '../../components/StatCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Card } from '../../components/Card';
import { InfoBanner } from '../../components/InfoBanner';
import { StatusPill } from '../../components/StatusPill';
import { SectionHeader } from '../../components/SectionHeader';
import { MapPreview } from '../../components/MapPreview';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useShakeSos } from '../../hooks/useShakeSos';
import { getApiErrorMessage } from '../../api/client';
import { getGreeting, formatDateTime } from '../../utils/date';
import { formatCoordinates } from '../../utils/format';
import { enableBackgroundTrackingIfPermitted, ensureForegroundLocationPermission, getBestEffortLocation, getReadableAddress } from '../../services/locationService';
import { scheduleLocalNotification } from '../../services/notificationService';
import { buildEmergencySms, callPrimaryEmergencyContact, sendEmergencySmsToContacts } from '../../services/emergencySosService';
import { getCachedValue, setCachedValue } from '../../utils/cache';
import { STORAGE_KEYS } from '../../constants/storage';
import { normalizePrivateShareUrl } from '../../utils/shareLink';

function ContactRow({ contact }) {
  const { theme } = useTheme();
  const initials = (contact.name || 'C').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md }}>
        <Text style={{ color: theme.colors.white, fontWeight: '900' }}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{contact.name}</Text>
        <Text style={{ color: theme.colors.textMuted, marginTop: 3 }}>{contact.relationship || 'Emergency contact'}</Text>
      </View>
      <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{contact.phone || contact.email || 'Saved'}</Text>
    </View>
  );
}

function SosStatusPanel({ stage, communicationResult, backgroundTrackingStatus }) {
  const { theme } = useTheme();
  if (!stage || stage === 'idle') return null;

  const activeIndex = ['locating', 'sending', 'tracking', 'active'].indexOf(stage);
  const steps = [
    { id: 'locating', label: 'GPS locked', icon: 'navigate-outline' },
    { id: 'sending', label: 'Alert saved', icon: 'shield-checkmark-outline' },
    { id: 'tracking', label: 'SMS / call flow', icon: 'call-outline' },
    { id: 'active', label: 'Live tracking', icon: 'radio-outline' },
  ];

  return (
    <Card elevated style={{ marginTop: theme.spacing.lg, borderColor: stage === 'failed' ? theme.colors.danger : theme.colors.primarySoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18 }}>{stage === 'failed' ? 'SOS needs attention' : 'Emergency status'}</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>
            {stage === 'active'
              ? 'Your emergency alert is saved and the private live link is active.'
              : stage === 'failed'
                ? 'SafeHer could not finish the emergency flow. Check network and retry.'
                : 'SafeHer is securing your GPS, trusted contact alert, and live tracking.'}
          </Text>
        </View>
        <View style={{ width: 52, height: 52, borderRadius: 24, backgroundColor: stage === 'failed' ? theme.colors.dangerSoft : theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={stage === 'failed' ? 'warning-outline' : 'pulse-outline'} size={24} color={stage === 'failed' ? theme.colors.danger : theme.colors.primary} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.lg }}>
        {steps.map((step, index) => {
          const done = stage === 'active' || activeIndex >= index;
          return <StatusPill key={step.id} label={step.label} tone={done ? 'success' : 'neutral'} icon={done ? 'checkmark-circle-outline' : step.icon} />;
        })}
      </View>
      {communicationResult ? (
        <Text style={{ color: theme.colors.textMuted, marginTop: theme.spacing.md, lineHeight: 20, fontWeight: '700' }}>
          SMS: {communicationResult.smsResult?.status || 'pending'} • Call: {communicationResult.callResult?.status || 'pending'}
        </Text>
      ) : null}
      {backgroundTrackingStatus ? (
        <Text style={{ color: theme.colors.textSubtle, marginTop: 6, lineHeight: 18 }}>{backgroundTrackingStatus}</Text>
      ) : null}
    </Card>
  );
}

export function HomeScreen({ navigation }) {
  const { user, sessionWarning } = useAuth();
  const { theme } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [activeShare, setActiveShare] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [sosResult, setSosResult] = useState(null);
  const [communicationResult, setCommunicationResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [silentSosMode, setSilentSosMode] = useState(false);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [pendingSosSource, setPendingSosSource] = useState('button');
  const [sosStage, setSosStage] = useState('idle');
  const [backgroundTrackingStatus, setBackgroundTrackingStatus] = useState('');

  const contactsCount = contacts.length;
  const previewContacts = useMemo(() => contacts.slice(0, 3), [contacts]);

  useEffect(() => {
    let mounted = true;
    getCachedValue(STORAGE_KEYS.silentSosMode, false).then((value) => {
      if (mounted) setSilentSosMode(Boolean(value));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    setDashboardError('');
    try {
      const [nextContacts, share, incidents] = await Promise.all([
        contactsApi.getContacts(),
        locationApi.getActiveShare(),
        incidentsApi.getIncidents(),
      ]);
      setContacts(nextContacts);
      setActiveShare(share);
      setRecentIncidents(incidents.slice(0, 3));
    } catch (error) {
      setDashboardError(getApiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const toggleSilentMode = async (value) => {
    setSilentSosMode(value);
    await setCachedValue(STORAGE_KEYS.silentSosMode, value);
  };

  const requestSos = useCallback((source = 'button') => {
    if (contactsCount === 0) {
      Alert.alert('Add a trusted contact first', 'SOS alerts need at least one trusted contact so SafeHer knows who to notify.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add contact', onPress: () => navigation.navigate('Contacts') },
      ]);
      return;
    }

    setPendingSosSource(source);
    setCountdownVisible(true);
  }, [contactsCount, navigation]);

  const { isAvailable: shakeAvailable, shakeCount } = useShakeSos({
    enabled: contactsCount > 0 && !sendingSos && !countdownVisible,
    onShake: () => requestSos('shake'),
    minimumShakes: 5,
  });

  const performSos = useCallback(async () => {
    setCountdownVisible(false);
    setSosStage('locating');
    setBackgroundTrackingStatus('');
    try {
      setSendingSos(true);
      setCommunicationResult(null);
      await ensureForegroundLocationPermission('Location permission is required to send SOS alerts and share your position.');

      const location = await getBestEffortLocation();
      const address = await getReadableAddress(location.coords);
      const payload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        address: address || 'Address unavailable',
        message: `Emergency SOS triggered from SafeHer by ${pendingSosSource === 'shake' ? 'shake detection' : 'SOS button'}.`,
      };

      setSosStage('sending');
      const response = await locationApi.triggerSos(payload);
      const normalizedShare = response.share ? { ...response.share, shareUrl: normalizePrivateShareUrl(response.share.shareUrl) } : null;
      setSosResult(response);
      setActiveShare(normalizedShare);
      if (normalizedShare) {
        await setCachedValue(STORAGE_KEYS.activeShare, normalizedShare);
      }

      setSosStage('tracking');
      const backgroundResult = await enableBackgroundTrackingIfPermitted().catch((error) => ({ started: false, reason: error.message }));
      setBackgroundTrackingStatus(backgroundResult.started ? 'Background tracking is active for this SOS session.' : `Foreground live tracking is active. ${backgroundResult.reason}`);

      const safeDeliveries = response.deliveries || [];
      const serverSmsCount = safeDeliveries.filter((delivery) => delivery.channel === 'sms' && delivery.status === 'sent').length;
      const serverCallCount = safeDeliveries.filter((delivery) => delivery.channel === 'voice_call' && ['queued', 'sent'].includes(delivery.status)).length;
      const smsMessage = buildEmergencySms({
        userName: user?.fullName || 'A SafeHer user',
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        shareUrl: normalizedShare?.shareUrl,
      });

      if (!silentSosMode) {
        const smsResult = serverSmsCount > 0
          ? { status: 'server-sent', recipients: safeDeliveries.filter((delivery) => delivery.channel === 'sms').map((delivery) => delivery.recipient), reason: 'Backend SMS provider delivered the emergency text.' }
          : await sendEmergencySmsToContacts({ contacts, message: smsMessage });
        const callResult = serverCallCount > 0
          ? { status: 'server-queued', reason: 'Backend voice provider queued the emergency call.' }
          : await callPrimaryEmergencyContact(contacts);
        setCommunicationResult({ smsResult, callResult });

        await scheduleLocalNotification({
          title: 'SOS alert sent',
          body: `Notified ${safeDeliveries.length} trusted contact(s).`,
          data: { type: 'sos-confirmation' },
          seconds: 1,
        });
      } else {
        setCommunicationResult({
          smsResult: { status: serverSmsCount > 0 ? 'server-sent' : 'silent-skipped', reason: serverSmsCount > 0 ? 'Backend SMS provider delivered silently.' : 'Silent mode kept SMS UI closed.' },
          callResult: { status: serverCallCount > 0 ? 'server-queued' : 'silent-skipped', reason: serverCallCount > 0 ? 'Backend voice provider queued the call silently.' : 'Silent mode kept call UI closed.' },
        });
      }
      setSosStage('active');
    } catch (error) {
      setSosStage('failed');
      Alert.alert('SOS failed', getApiErrorMessage(error));
    } finally {
      setSendingSos(false);
    }
  }, [contacts, pendingSosSource, silentSosMode, user?.fullName]);

  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} tintColor={theme.colors.primary} />}>
      <SOSCountdownModal
        visible={countdownVisible}
        source={pendingSosSource}
        silentMode={silentSosMode}
        onCancel={() => setCountdownVisible(false)}
        onConfirm={performSos}
      />

      <View style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.xxl, padding: theme.spacing.xl, marginBottom: theme.spacing.xl, overflow: 'hidden', ...theme.shadow }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -42, top: -46, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.17)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: -42, bottom: -54, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(0,0,0,0.10)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark" size={23} color={theme.colors.primary} />
            </View>
            <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 22, letterSpacing: -0.4 }}>SafeHer</Text>
          </View>
          <Pressable onPress={() => navigation.getParent()?.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Open settings" style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, backgroundColor: pressed ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' })}>
            <Ionicons name="settings-outline" size={21} color={theme.colors.white} />
          </Pressable>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.78)', fontWeight: '800', marginTop: theme.spacing.xl }}>{getGreeting()}, {firstName}</Text>
        <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 30, lineHeight: 36, marginTop: 6, letterSpacing: -0.8 }}>One tap away from security.</Text>
        <Text style={{ color: 'rgba(255,255,255,0.86)', marginTop: 8, lineHeight: 21 }}>Hold SOS or shake your phone 4–5 times. You get 3 seconds to cancel before SafeHer sends your alert.</Text>
      </View>

      {sessionWarning ? <InfoBanner tone="warning" title="Limited connectivity" message={sessionWarning} style={{ marginBottom: theme.spacing.lg }} /> : null}
      {dashboardError ? <InfoBanner tone="warning" title="Dashboard partially unavailable" message={dashboardError} style={{ marginBottom: theme.spacing.lg }} /> : null}

      <SOSButton onTrigger={() => requestSos('button')} loading={sendingSos} disabled={sendingSos} />

      <SosStatusPanel stage={sosStage} communicationResult={communicationResult} backgroundTrackingStatus={backgroundTrackingStatus} />

      <Card elevated style={{ marginTop: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 17 }}>Silent SOS mode</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>Keeps emergency flow discreet by avoiding call and SMS screens after SOS is saved.</Text>
          </View>
          <Switch value={silentSosMode} onValueChange={toggleSilentMode} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md }}>
          <StatusPill label={shakeAvailable ? 'Shake armed' : 'Shake unavailable'} tone={shakeAvailable ? 'success' : 'neutral'} icon="phone-portrait-outline" />
          <StatusPill label={shakeCount > 0 ? `${shakeCount}/5 shakes` : '5 shakes to SOS'} tone={shakeCount > 0 ? 'warning' : 'info'} icon="pulse-outline" />
        </View>
      </Card>

      {sosResult ? (
        <InfoBanner
          tone={sosResult.deliveryWarning ? 'warning' : 'success'}
          title={sosResult.deliveryWarning ? 'SOS saved with delivery warning' : 'Latest SOS sent successfully'}
          message={sosResult.deliveryWarning || `Trusted contacts notified: ${(sosResult.deliveries || []).length}. Coordinates: ${formatCoordinates(sosResult.sosEvent.latitude, sosResult.sosEvent.longitude)}.`}
          style={{ marginTop: theme.spacing.lg }}
        />
      ) : null}

      {communicationResult ? (
        <InfoBanner
          tone={communicationResult.smsResult?.status === 'failed' || communicationResult.callResult?.status === 'failed' ? 'warning' : 'info'}
          title="Device emergency actions"
          message={`SMS: ${communicationResult.smsResult?.status || 'unknown'}. Call: ${communicationResult.callResult?.status || 'unknown'}. ${communicationResult.smsResult?.reason || communicationResult.callResult?.reason || ''}`}
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <StatCard label="Contacts" value={contactsCount} helper="SOS recipients" tone={contactsCount > 0 ? 'success' : 'danger'} />
        <StatCard label="Live share" value={activeShare ? 'ON' : 'OFF'} helper={activeShare ? 'Route visible' : 'No active link'} tone={activeShare ? 'success' : 'neutral'} />
      </View>

      <SectionHeader title="Your emergency contact" subtitle="People who can receive your alerts." style={{ marginTop: theme.spacing.xl }} action={<PrimaryButton title="Add" variant="secondary" onPress={() => navigation.navigate('Contacts')} style={{ paddingVertical: 10, minHeight: 42 }} />} />
      <Card elevated style={{ paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
        {previewContacts.length === 0 ? (
          <View style={{ paddingVertical: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16 }}>No emergency contacts yet</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>Add at least one trusted person before relying on SOS.</Text>
          </View>
        ) : previewContacts.map((contact, index) => (
          <View key={contact.id} style={{ borderBottomWidth: index === previewContacts.length - 1 ? 0 : 0 }}>
            <ContactRow contact={contact} />
          </View>
        ))}
      </Card>

      {activeShare ? (
        <MapPreview
          active
          label="Your live location is shared"
          latitude={activeShare.last_latitude}
          longitude={activeShare.last_longitude}
          style={{ marginTop: theme.spacing.xl }}
          footer={(
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <StatusPill label="Active session" tone="success" icon="radio-outline" />
                <Text style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 20 }}>{activeShare.note || 'Emergency live sharing is active.'}</Text>
              </View>
              <Ionicons name="navigate" size={24} color={theme.colors.success} />
            </View>
          )}
        />
      ) : null}

      <SectionHeader title="Quick actions" subtitle="Move fast without searching through menus." style={{ marginTop: theme.spacing.xl }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <ActionCard icon="location-outline" title="Live share" subtitle="Start or stop route sharing" onPress={() => navigation.navigate('LiveShare')} tone="success" />
        <ActionCard icon="people-outline" title="Guardians" subtitle="Manage safety network" onPress={() => navigation.navigate('Contacts')} />
        <ActionCard icon="chatbubbles-outline" title="Community" subtitle="Anonymous nearby discussions" onPress={() => navigation.getParent()?.navigate('Community')} tone="warning" />
        <ActionCard icon="folder-open-outline" title="Evidence vault" subtitle="Lock private proof securely" onPress={() => navigation.getParent()?.navigate('EvidenceVault')} tone="info" />
        <ActionCard icon="medical-outline" title="Help centers" subtitle="Police and hospitals nearby" onPress={() => navigation.getParent()?.navigate('HelpCenters')} tone="info" />
      </View>

      <SectionHeader
        title="Reports"
        subtitle="Latest saved incidents and evidence."
        style={{ marginTop: theme.spacing.xl }}
        action={<PrimaryButton title="Report" variant="secondary" onPress={() => navigation.getParent()?.navigate('ReportIncident')} style={{ paddingVertical: 10, minHeight: 42 }} />}
      />

      {recentIncidents.length === 0 ? (
        <Card>
          <Text style={{ color: theme.colors.text, fontWeight: '900' }}>No incidents reported yet</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 20 }}>Record suspicious activity, unsafe areas, harassment, or supporting image evidence when needed.</Text>
        </Card>
      ) : recentIncidents.map((incident) => (
        <Card key={incident.id} elevated style={{ marginBottom: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16, flex: 1 }}>{incident.title}</Text>
            <StatusPill label={incident.category} tone="warning" />
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 7, lineHeight: 20 }} numberOfLines={2}>{incident.description}</Text>
          <Text style={{ color: theme.colors.textSubtle, marginTop: 8 }}>{formatDateTime(incident.created_at)}</Text>
        </Card>
      ))}
    </ScreenWrapper>
  );
}
