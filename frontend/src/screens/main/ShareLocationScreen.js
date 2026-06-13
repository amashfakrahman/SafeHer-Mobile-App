import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, RefreshControl, Share as NativeShare, Switch, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import * as locationApi from '../../api/locationApi';
import { getApiErrorMessage } from '../../api/client';
import { AppHeader } from '../../components/AppHeader';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Card } from '../../components/Card';
import { StatusPill } from '../../components/StatusPill';
import { InfoBanner } from '../../components/InfoBanner';
import { PermissionPrimer } from '../../components/PermissionPrimer';
import { MapPreview } from '../../components/MapPreview';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useTheme } from '../../hooks/useTheme';
import {
  disableBackgroundTracking,
  enableBackgroundTracking,
  ensureForegroundLocationPermission,
  getBackgroundTrackingState,
  getBestEffortLocation,
  toLocationPayload,
} from '../../services/locationService';
import { formatCoordinates } from '../../utils/format';
import { formatDateTime } from '../../utils/date';
import { getCachedValue, removeCachedValue, setCachedValue } from '../../utils/cache';
import { STORAGE_KEYS } from '../../constants/storage';
import { normalizePrivateShareUrl } from '../../utils/shareLink';

const DEFAULT_NOTE = 'Share my live location with trusted contacts.';
const EXPIRY_OPTIONS = [
  { label: '30m', value: '30' },
  { label: '2h', value: '120' },
  { label: '8h', value: '480' },
  { label: '24h', value: '1440' },
];

function formatExpiry(share) {
  const expiresAt = share?.expiresAt || share?.expires_at;
  if (!expiresAt) return 'No automatic expiry';
  return formatDateTime(expiresAt);
}

export function ShareLocationScreen() {
  const { theme } = useTheme();
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [expiryMinutes, setExpiryMinutes] = useState('120');
  const [activeShare, setActiveShare] = useState(null);
  const [latestLocation, setLatestLocation] = useState(null);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastRealtimeSyncAt, setLastRealtimeSyncAt] = useState(null);

  const activeShareLink = useMemo(() => normalizePrivateShareUrl(activeShare?.shareUrl), [activeShare?.shareUrl]);

  const loadShareState = useCallback(async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const cachedShare = await getCachedValue(STORAGE_KEYS.activeShare, null);
      if (cachedShare) {
        setActiveShare(cachedShare);
        setNote(cachedShare.note || DEFAULT_NOTE);
      }

      const [share, location, backgroundState] = await Promise.all([
        locationApi.getActiveShare(),
        locationApi.getLatestLocation(),
        getBackgroundTrackingState(),
      ]);

      const normalizedShare = share ? { ...share, shareUrl: normalizePrivateShareUrl(share.shareUrl) } : null;
      setActiveShare(normalizedShare);
      setLatestLocation(location);
      setBackgroundEnabled(backgroundState);
      if (normalizedShare) {
        setNote(normalizedShare.note || DEFAULT_NOTE);
        await setCachedValue(STORAGE_KEYS.activeShare, normalizedShare);
      } else {
        await removeCachedValue(STORAGE_KEYS.activeShare);
      }
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShareState();
    }, [loadShareState])
  );

  const syncLocationSilently = useCallback(async () => {
    if (!activeShare) return;
    try {
      const location = await getBestEffortLocation();
      const payload = toLocationPayload(location, 'realtime-link-sync');
      const updatedShare = await locationApi.updateShare(payload);
      const normalizedShare = { ...updatedShare, shareUrl: normalizePrivateShareUrl(updatedShare.shareUrl) };
      setLatestLocation({
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        created_at: new Date().toISOString(),
      });
      setActiveShare(normalizedShare);
      setLastRealtimeSyncAt(new Date().toISOString());
      await setCachedValue(STORAGE_KEYS.activeShare, normalizedShare);
    } catch (_error) {
      // Foreground polling should be best effort and never interrupt the user.
    }
  }, [activeShare]);

  useEffect(() => {
    if (!activeShare) return undefined;
    const interval = setInterval(syncLocationSilently, 8000);
    return () => clearInterval(interval);
  }, [activeShare, syncLocationSilently]);

  const refreshLocation = async () => {
    try {
      setLoading(true);
      setStatusMessage('');
      await ensureForegroundLocationPermission('Location permission is required to refresh your live position.');

      const location = await getBestEffortLocation();
      const payload = toLocationPayload(location, 'manual-refresh');

      const savedLocation = await locationApi.postCurrentLocation(payload);
      setLatestLocation(savedLocation);

      if (activeShare) {
        const updatedShare = await locationApi.updateShare(payload);
        const normalizedShare = { ...updatedShare, shareUrl: normalizePrivateShareUrl(updatedShare.shareUrl) };
        setActiveShare(normalizedShare);
        await setCachedValue(STORAGE_KEYS.activeShare, normalizedShare);
      }
      setStatusMessage('Location updated successfully.');
    } catch (error) {
      Alert.alert('Refresh failed', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const startSharing = async () => {
    try {
      setLoading(true);
      setStatusMessage('');
      await ensureForegroundLocationPermission('Location permission is required to start live sharing.');

      const location = await getBestEffortLocation();
      const payload = {
        ...toLocationPayload(location, 'share-start'),
        note,
        expiresInMinutes: Number(expiryMinutes),
      };

      const share = await locationApi.startShare(payload);
      const normalizedShare = { ...share, shareUrl: normalizePrivateShareUrl(share.shareUrl) };
      setActiveShare(normalizedShare);
      setLatestLocation({
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        created_at: new Date().toISOString(),
      });
      setLastRealtimeSyncAt(new Date().toISOString());
      await setCachedValue(STORAGE_KEYS.activeShare, normalizedShare);
      setStatusMessage('Secure private link is active. It will update in real time while this screen is open.');
    } catch (error) {
      Alert.alert('Start failed', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const confirmStopSharing = () => {
    Alert.alert('Revoke private link?', 'Anyone with the link will immediately lose access to your live location.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke link', style: 'destructive', onPress: stopSharing },
    ]);
  };

  const stopSharing = async () => {
    try {
      setLoading(true);
      await locationApi.stopShare();
      await disableBackgroundTracking();
      setBackgroundEnabled(false);
      setActiveShare(null);
      await removeCachedValue(STORAGE_KEYS.activeShare);
      setStatusMessage('Private link revoked and live sharing stopped.');
    } catch (error) {
      Alert.alert('Stop failed', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleBackground = async (value) => {
    if (value && !activeShare) {
      Alert.alert('Start sharing first', 'Background tracking can only run while a live share session is active.');
      return;
    }

    try {
      if (value) {
        await enableBackgroundTracking();
      } else {
        await disableBackgroundTracking();
      }
      setBackgroundEnabled(value);
    } catch (error) {
      Alert.alert('Background tracking', getApiErrorMessage(error));
      setBackgroundEnabled(false);
    }
  };

  const copyShareLink = async () => {
    if (!activeShareLink) return;
    await Clipboard.setStringAsync(activeShareLink);
    setStatusMessage('Private live link copied to clipboard.');
  };

  const sharePrivateLink = async () => {
    if (!activeShareLink) return;
    await NativeShare.share({
      message: `Follow my SafeHer live location: ${activeShareLink}`,
      url: activeShareLink,
      title: 'SafeHer private live location',
    });
  };

  const openLink = () => {
    if (activeShareLink) {
      Linking.openURL(activeShareLink);
    }
  };

  const statusTone = statusMessage.includes('success') || statusMessage.includes('active') || statusMessage.includes('copied') || statusMessage.includes('stopped') || statusMessage.includes('revoked') ? 'success' : 'warning';
  const previewLatitude = activeShare?.last_latitude ?? latestLocation?.latitude;
  const previewLongitude = activeShare?.last_longitude ?? latestLocation?.longitude;

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={loadShareState} tintColor={theme.colors.primary} />}>
      <AppHeader eyebrow="Private link" title="Live location" subtitle="Create a secure link, set expiry, and revoke it any time." />

      <MapPreview
        active={Boolean(activeShare)}
        label={activeShare ? 'Your live location is shared' : 'Near to your location'}
        latitude={previewLatitude}
        longitude={previewLongitude}
        style={{ marginBottom: theme.spacing.lg }}
        footer={(
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{activeShare ? 'Real-time link active' : 'Ready to share'}</Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 5, lineHeight: 19 }}>Last updated: {latestLocation?.created_at ? formatDateTime(latestLocation.created_at) : 'Never'}</Text>
              {lastRealtimeSyncAt ? <Text style={{ color: theme.colors.success, marginTop: 5, fontWeight: '800' }}>Realtime sync: {formatDateTime(lastRealtimeSyncAt)}</Text> : null}
            </View>
            <StatusPill label={activeShare ? 'Live' : 'Off'} tone={activeShare ? 'success' : 'neutral'} icon={activeShare ? 'radio-outline' : 'location-outline'} />
          </View>
        )}
      />

      <PermissionPrimer
        icon="lock-closed-outline"
        title="Private link safety"
        body="SafeHer creates a hard-to-guess tokenized link, keeps it active only until expiry or revoke, and updates your location while sharing is active."
        points={['Use short expiry for temporary trips.', 'Revoke immediately when you are safe.', 'Share the link only with people you trust.']}
      />

      {statusMessage ? <InfoBanner tone={statusTone} message={statusMessage} style={{ marginBottom: theme.spacing.lg }} /> : null}

      <Card elevated>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18 }}>Current location</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 7, lineHeight: 20 }}>{previewLatitude !== null && previewLatitude !== undefined && previewLongitude !== null && previewLongitude !== undefined ? formatCoordinates(previewLatitude, previewLongitude) : 'No location captured yet.'}</Text>
          </View>
          <View style={{ width: 52, height: 52, borderRadius: 22, backgroundColor: activeShare ? theme.colors.successSoft : theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={activeShare ? 'navigate' : 'navigate-outline'} size={24} color={activeShare ? theme.colors.success : theme.colors.primary} />
          </View>
        </View>
        <FormInput
          label="Sharing note"
          value={note}
          onChangeText={setNote}
          placeholder="I am going home, follow my route if needed."
          multiline
          helper="This note appears with your share session. Avoid adding private details you do not want viewers to see."
          leftIcon="chatbubble-ellipses-outline"
        />
        {!activeShare ? (
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', marginBottom: theme.spacing.sm }}>Link expiry</Text>
            <SegmentedControl options={EXPIRY_OPTIONS} value={expiryMinutes} onChange={setExpiryMinutes} />
          </View>
        ) : null}
        <PrimaryButton title="Refresh location now" variant="secondary" onPress={refreshLocation} loading={loading && !activeShare} />
      </Card>

      {!activeShare ? (
        <PrimaryButton title="Start secure live sharing" onPress={startSharing} loading={loading} style={{ marginTop: theme.spacing.md }} />
      ) : (
        <View style={{ marginTop: theme.spacing.md }}>
          <Card elevated style={{ backgroundColor: theme.colors.successSoft, borderColor: theme.colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.success, fontWeight: '900', fontSize: 16 }}>Secure private link active</Text>
                <Text style={{ color: theme.colors.textMuted, marginTop: 7, lineHeight: 20 }}>Expires: {formatExpiry(activeShare)}</Text>
              </View>
              <Ionicons name="shield-checkmark" size={28} color={theme.colors.success} />
            </View>
            <Text style={{ color: theme.colors.text, marginTop: 12, fontWeight: '800' }} numberOfLines={2}>{activeShareLink}</Text>
          </Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
            <PrimaryButton title="Copy" variant="secondary" onPress={copyShareLink} style={{ flex: 1 }} />
            <PrimaryButton title="Share" variant="secondary" onPress={sharePrivateLink} style={{ flex: 1 }} />
            <PrimaryButton title="Open" variant="secondary" onPress={openLink} style={{ flex: 1 }} />
          </View>
          <PrimaryButton title="Revoke private link" variant="danger" onPress={confirmStopSharing} loading={loading} style={{ marginTop: theme.spacing.md }} />
        </View>
      )}

      <Card elevated style={{ marginTop: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 17 }}>Background tracking</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>Keep sending updates while minimized. Foreground real-time sync runs every few seconds while this screen is open.</Text>
            <Text style={{ color: theme.colors.textSubtle, marginTop: 8 }}>Platform: {Platform.OS}</Text>
          </View>
          <Switch value={backgroundEnabled} onValueChange={toggleBackground} disabled={!activeShare} />
        </View>
      </Card>
    </ScreenWrapper>
  );
}
