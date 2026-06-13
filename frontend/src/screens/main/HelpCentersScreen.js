import React, { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import * as helpCentersApi from '../../api/helpCentersApi';
import { getApiErrorMessage } from '../../api/client';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { HelpCenterCard } from '../../components/HelpCenterCard';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { InfoBanner } from '../../components/InfoBanner';
import { InlineLoader } from '../../components/InlineLoader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Card } from '../../components/Card';
import { useTheme } from '../../hooks/useTheme';
import { getBestEffortLocation, requestForegroundLocationPermission } from '../../services/locationService';
import { getCachedValue, setCachedValue } from '../../utils/cache';
import { STORAGE_KEYS } from '../../constants/storage';

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Police', value: 'police' },
  { label: 'Hospital', value: 'hospital' },
];

export function HelpCentersScreen({ navigation }) {
  const { theme } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [usedLocation, setUsedLocation] = useState(false);

  const loadCenters = useCallback(async (type = selectedFilter) => {
    setLoading(true);
    setLoadError('');
    try {
      const cachedCenters = await getCachedValue(STORAGE_KEYS.cachedHelpCenters, []);
      if (cachedCenters.length > 0) {
        setCenters(type === 'all' ? cachedCenters : cachedCenters.filter((center) => center.type === type));
      }

      let location = null;
      try {
        const permission = await requestForegroundLocationPermission();
        if (permission.status === 'granted') {
          location = await getBestEffortLocation();
        }
      } catch (_locationError) {
        location = null;
      }

      setUsedLocation(Boolean(location?.coords));
      const nextCenters = await helpCentersApi.getHelpCenters({
        type,
        latitude: location?.coords?.latitude,
        longitude: location?.coords?.longitude,
      });
      setCenters(nextCenters);
      if (type === 'all') {
        await setCachedValue(STORAGE_KEYS.cachedHelpCenters, nextCenters);
      }
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      loadCenters();
    }, [loadCenters])
  );

  const handleFilterPress = async (value) => {
    setSelectedFilter(value);
    await loadCenters(value);
  };

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadCenters(selectedFilter)} tintColor={theme.colors.primary} />}>
      <AppHeader eyebrow="Support" title="Nearby help centers" subtitle="Police stations and hospitals sorted by approximate distance when location is available." onBack={() => navigation.goBack()} />

      <Card elevated style={{ backgroundColor: theme.colors.primary, marginBottom: theme.spacing.lg, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -42, bottom: -48, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.16)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View style={{ width: 58, height: 58, borderRadius: 24, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="medkit-outline" size={30} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 22, letterSpacing: -0.4 }}>Quick emergency support</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: 5, lineHeight: 20 }}>Call or open directions for nearby safety services.</Text>
          </View>
        </View>
      </Card>

      <InfoBanner
        tone={usedLocation ? 'success' : 'info'}
        title={usedLocation ? 'Sorted by your area' : 'Location improves sorting'}
        message={usedLocation ? 'SafeHer used your approximate location to sort support options.' : 'You can still view seeded help centers without location permission.'}
        style={{ marginBottom: theme.spacing.lg }}
      />

      <SegmentedControl options={filters} value={selectedFilter} onChange={handleFilterPress} style={{ marginBottom: theme.spacing.lg }} />

      {loadError ? <InfoBanner tone="warning" title="Unable to refresh help centers" message={loadError} style={{ marginBottom: theme.spacing.lg }} /> : null}
      {loading && centers.length === 0 ? <InlineLoader label="Loading help centers..." /> : null}

      {centers.length === 0 && !loading ? (
        <EmptyState icon="medical-outline" title="No help centers found" message="Try again with a different filter or after enabling location permission." />
      ) : centers.map((center) => <HelpCenterCard key={center.id} center={center} />)}
    </ScreenWrapper>
  );
}
