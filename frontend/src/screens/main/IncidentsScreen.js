import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import * as incidentsApi from '../../api/incidentsApi';
import { getApiErrorMessage } from '../../api/client';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Card } from '../../components/Card';
import { StatusPill } from '../../components/StatusPill';
import { InfoBanner } from '../../components/InfoBanner';
import { InlineLoader } from '../../components/InlineLoader';
import { StatCard } from '../../components/StatCard';
import { IncidentMapCanvas, getIncidentClusters } from '../../components/IncidentMapCanvas';
import { buildUnsafeZoneWarning } from '../../services/safetyPredictionService';
import { buildRouteOptions, buildSafetyPrediction } from '../../utils/safetyPredictionEngine';
import { useTheme } from '../../hooks/useTheme';
import { formatCoordinates } from '../../utils/format';
import { formatDateTime } from '../../utils/date';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All', icon: 'layers-outline' },
  { id: 'harassment', label: 'Harassment', icon: 'alert-circle-outline' },
  { id: 'unsafe-area', label: 'Unsafe', icon: 'warning-outline' },
  { id: 'suspicious-activity', label: 'Suspicious', icon: 'eye-outline' },
  { id: 'general', label: 'General', icon: 'pin-outline' },
];

const TIME_FILTERS = [
  { id: 'all', label: 'All time' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
];

const ROUTE_GOALS = [
  { id: 'help', label: 'Nearest help', icon: 'medkit-outline', destination: 'verified police / hospital / support point', hint: 'Best when risk is high or you feel unsafe.' },
  { id: 'public', label: 'Main road', icon: 'walk-outline', destination: 'open public road with people nearby', hint: 'Best for daily travel and safer visibility.' },
  { id: 'trusted', label: 'Trusted place', icon: 'home-outline', destination: 'home, campus, office, or saved safe place', hint: 'Best when you already know the destination.' },
];

function isWithinTimeFilter(incident, filter) {
  if (filter === 'all') return true;
  const created = new Date(incident.created_at).getTime();
  if (!Number.isFinite(created)) return true;
  const ageMs = Date.now() - created;
  if (filter === '24h') return ageMs <= 24 * 60 * 60 * 1000;
  if (filter === '7d') return ageMs <= 7 * 24 * 60 * 60 * 1000;
  if (filter === '30d') return ageMs <= 30 * 24 * 60 * 60 * 1000;
  return true;
}

function getGoalDetail(goalId) {
  return ROUTE_GOALS.find((item) => item.id === goalId) || ROUTE_GOALS[0];
}

function getRiskLabel(riskIndex) {
  if (riskIndex >= 65) return 'High';
  if (riskIndex >= 38) return 'Medium';
  return 'Low';
}

function getScoreTone(score) {
  if (score >= 80) return 'success';
  if (score >= 55) return 'warning';
  return 'danger';
}

function getChecklist(activeRoute, prediction, goalDetail) {
  if (!activeRoute) return [];
  const checklist = [
    `Use ${activeRoute.label.toLowerCase()} toward ${goalDetail.destination}.`,
    prediction.riskIndex >= 38 ? 'Keep live location sharing on before moving.' : 'Keep SOS ready and stay on visible roads.',
    activeRoute.id === 'fast' ? 'Fast route is only suggested when the area is calm.' : 'Avoid red heat zones and follow the green safe-area direction.',
  ];
  if (prediction.isNight) {
    checklist.push('Night mode: prefer bright public roads and avoid isolated shortcuts.');
  }
  return checklist;
}

function FilterChip({ label, icon, active, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.primary : pressed ? theme.colors.primaryTint : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      })}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? theme.colors.white : theme.colors.primary} /> : null}
      <Text style={{ color: active ? theme.colors.white : theme.colors.text, fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}

function GoalChip({ goal, active, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        width: 158,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.md,
        backgroundColor: active ? theme.colors.primary : pressed ? theme.colors.primaryTint : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 16, backgroundColor: active ? theme.colors.white : theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={goal.icon} size={20} color={active ? theme.colors.primary : theme.colors.primary} />
      </View>
      <Text style={{ color: active ? theme.colors.white : theme.colors.text, fontWeight: '900', marginTop: 10 }}>{goal.label}</Text>
      <Text style={{ color: active ? 'rgba(255,255,255,0.78)' : theme.colors.textMuted, marginTop: 5, lineHeight: 17 }} numberOfLines={2}>{goal.hint}</Text>
    </Pressable>
  );
}

function NearbyIncidentCard({ incident, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 252, marginRight: theme.spacing.md, opacity: pressed ? 0.75 : 1 })}>
      <Card elevated style={{ minHeight: 148, backgroundColor: theme.colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <StatusPill label={incident.category} tone="warning" />
          <Text style={{ color: theme.colors.textSubtle, fontWeight: '800' }}>{formatDateTime(incident.created_at)}</Text>
        </View>
        <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 17, marginTop: 12 }} numberOfLines={1}>{incident.title}</Text>
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20, marginTop: 8 }} numberOfLines={2}>{incident.description}</Text>
        {incident.latitude && incident.longitude ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <Ionicons name="location-outline" size={15} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textSubtle, fontWeight: '700' }}>{formatCoordinates(incident.latitude, incident.longitude)}</Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

function RouteOption({ option, active, recommended, onPress }) {
  const { theme } = useTheme();
  const routeColor = option.id === 'safe' ? theme.colors.success : option.id === 'balanced' ? theme.colors.warning : theme.colors.danger;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 174,
        backgroundColor: active ? theme.colors.black : theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: active ? routeColor : recommended ? routeColor : theme.colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 42, height: 42, borderRadius: 18, backgroundColor: active ? routeColor : theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={option.icon} size={20} color={active ? theme.colors.white : routeColor} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: routeColor, fontWeight: '900', fontSize: 20 }}>{option.safetyScore}</Text>
          {recommended ? <Text style={{ color: active ? theme.colors.white : routeColor, fontWeight: '900', fontSize: 10 }}>BEST</Text> : null}
        </View>
      </View>
      <Text style={{ color: active ? theme.colors.white : theme.colors.text, fontWeight: '900', fontSize: 16, marginTop: 12 }}>{option.label}</Text>
      <Text style={{ color: active ? 'rgba(255,255,255,0.72)' : theme.colors.textMuted, marginTop: 4, fontWeight: '800' }}>{option.eta} • {option.risk}</Text>
      <Text style={{ color: active ? 'rgba(255,255,255,0.72)' : theme.colors.textMuted, marginTop: 8, lineHeight: 18 }} numberOfLines={3}>{option.description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {(option.reasons || []).slice(0, 2).map((reason) => (
          <Text key={reason} style={{ color: active ? theme.colors.white : routeColor, fontSize: 11, fontWeight: '900' }}>• {reason}</Text>
        ))}
      </View>
    </Pressable>
  );
}

function PredictionMeter({ label, score, helper }) {
  const { theme } = useTheme();
  const tone = getScoreTone(score);
  const color = tone === 'success' ? theme.colors.success : tone === 'warning' ? theme.colors.warning : theme.colors.danger;
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
        <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{label}</Text>
        <Text style={{ color, fontWeight: '900' }}>{score}/100</Text>
      </View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: theme.colors.border, marginTop: 8, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(8, Math.min(100, score))}%`, height: 10, borderRadius: 999, backgroundColor: color }} />
      </View>
      {helper ? <Text style={{ color: theme.colors.textMuted, marginTop: 7, lineHeight: 19 }}>{helper}</Text> : null}
    </View>
  );
}

function ActionChecklist({ items }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.successSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Ionicons name="checkmark" size={14} color={theme.colors.success} />
          </View>
          <Text style={{ flex: 1, color: theme.colors.textMuted, lineHeight: 21, fontWeight: '700' }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SelectedClusterSheet({ cluster }) {
  const { theme } = useTheme();
  if (!cluster?.items?.length) return null;
  return (
    <Card elevated style={{ marginTop: theme.spacing.lg, borderColor: theme.colors.borderStrong }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18 }}>Selected danger zone</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>{cluster.items.length} report(s) found in this map cluster.</Text>
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 20, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="flame-outline" size={22} color={theme.colors.primary} />
        </View>
      </View>
      {cluster.items.slice(0, 3).map((incident) => (
        <View key={incident.id} style={{ marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', flex: 1 }}>{incident.title}</Text>
            <StatusPill label={incident.category} tone="warning" />
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }} numberOfLines={2}>{incident.description}</Text>
          <Text style={{ color: theme.colors.textSubtle, marginTop: 6 }}>{formatDateTime(incident.created_at)}</Text>
        </View>
      ))}
    </Card>
  );
}

export function IncidentsScreen({ navigation }) {
  const { theme } = useTheme();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedRouteMode, setSelectedRouteMode] = useState('safe');
  const [routeGoal, setRouteGoal] = useState('help');
  const [routeStarted, setRouteStarted] = useState(false);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const nextIncidents = await incidentsApi.getIncidents();
      setIncidents(nextIncidents);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [loadIncidents])
  );

  const filteredIncidents = useMemo(() => incidents.filter((incident) => {
    const categoryMatches = categoryFilter === 'all' || incident.category === categoryFilter;
    return categoryMatches && isWithinTimeFilter(incident, timeFilter);
  }), [categoryFilter, incidents, timeFilter]);

  const mapIncidents = useMemo(() => filteredIncidents.filter((incident) => incident.latitude && incident.longitude), [filteredIncidents]);
  const unmappedCount = filteredIncidents.length - mapIncidents.length;
  const clusters = useMemo(() => getIncidentClusters(mapIncidents), [mapIncidents]);
  const routeOptions = useMemo(() => buildRouteOptions(filteredIncidents), [filteredIncidents]);
  const safetyPrediction = useMemo(() => buildSafetyPrediction(filteredIncidents), [filteredIncidents]);
  const routeWarning = useMemo(() => buildUnsafeZoneWarning(filteredIncidents), [filteredIncidents]);
  const activeRoute = routeOptions.find((option) => option.id === selectedRouteMode) || routeOptions[0];
  const recommendedRoute = useMemo(() => [...routeOptions].sort((a, b) => b.safetyScore - a.safetyScore)[0] || null, [routeOptions]);
  const selectedClusterItems = selectedCluster?.items || [];
  const routeGoalDetail = getGoalDetail(routeGoal);
  const checklist = getChecklist(activeRoute, safetyPrediction, routeGoalDetail);

  const stats = useMemo(() => {
    const withImage = incidents.filter((incident) => incident.image_url).length;
    const withLocation = incidents.filter((incident) => incident.latitude && incident.longitude).length;
    return { withImage, withLocation };
  }, [incidents]);

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={loadIncidents} tintColor={theme.colors.primary} />}>
      <AppHeader eyebrow="AI safe route" title="Safety Route Prediction" subtitle="Choose a destination type, compare route safety, and start safer travel mode." />

      <Card elevated style={{ backgroundColor: theme.colors.primary, marginBottom: theme.spacing.lg, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -42, top: -42, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View style={{ width: 58, height: 58, borderRadius: 24, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={28} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 22, letterSpacing: -0.4 }}>AI route safety assistant</Text>
            <Text style={{ color: 'rgba(255,255,255,0.84)', marginTop: 5, lineHeight: 20 }}>It reads recent reports, danger clusters, night risk, and safe-area signals before suggesting a safer route.</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          <PrimaryButton title="Report risk" variant="secondary" onPress={() => navigation.getParent()?.navigate('ReportIncident')} style={{ flex: 1, backgroundColor: theme.colors.white }} />
          <PrimaryButton title="Live share" variant="secondary" onPress={() => navigation.navigate('LiveShare')} style={{ flex: 1, backgroundColor: theme.colors.white }} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
        <StatCard label="Reports" value={incidents.length} helper="Total" tone="danger" />
        <StatCard label="On map" value={stats.withLocation} helper="GPS" tone="success" />
        <StatCard label="Risk" value={getRiskLabel(safetyPrediction.riskIndex)} helper={`${safetyPrediction.riskIndex}/100`} tone={safetyPrediction.riskIndex >= 65 ? 'danger' : safetyPrediction.riskIndex >= 38 ? 'warning' : 'success'} />
      </View>

      {loadError ? <InfoBanner tone="warning" title="Unable to load incident history" message={loadError} style={{ marginBottom: theme.spacing.lg }} /> : null}
      {loading && incidents.length === 0 ? <InlineLoader label="Loading map reports..." /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: theme.spacing.sm }}>
        {CATEGORY_FILTERS.map((item) => <FilterChip key={item.id} label={item.label} icon={item.icon} active={categoryFilter === item.id} onPress={() => setCategoryFilter(item.id)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: theme.spacing.md }}>
        {TIME_FILTERS.map((item) => <FilterChip key={item.id} label={item.label} active={timeFilter === item.id} onPress={() => setTimeFilter(item.id)} />)}
      </ScrollView>

      {filteredIncidents.length === 0 && !loading ? (
        <EmptyState
          icon="warning-outline"
          title="No incidents match this filter"
          message="Try changing the category or time filter, or create a new report with location enabled."
          actionLabel="Create report"
          onAction={() => navigation.getParent()?.navigate('ReportIncident')}
        />
      ) : (
        <>
          <IncidentMapCanvas
            incidents={mapIncidents}
            selectedClusterId={selectedCluster?.id}
            routeMode={selectedRouteMode}
            routeOption={activeRoute}
            onSelectCluster={(cluster) => setSelectedCluster(cluster)}
          />

          <InfoBanner tone={routeWarning.tone} title={routeWarning.title} message={routeWarning.message} style={{ marginTop: theme.spacing.lg }} />

          <Card elevated style={{ marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 20 }}>AI safe-route planner</Text>
                <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>Pick your goal, compare route options, then start safe mode before moving.</Text>
              </View>
              <StatusPill label={`${safetyPrediction.confidence} confidence`} tone={safetyPrediction.confidence === 'High' ? 'success' : 'warning'} icon="analytics-outline" />
            </View>

            <Text style={{ color: theme.colors.text, fontWeight: '900', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>Where are you trying to go?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.md }}>
              {ROUTE_GOALS.map((goal) => (
                <GoalChip key={goal.id} goal={goal} active={routeGoal === goal.id} onPress={() => setRouteGoal(goal.id)} />
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Route options</Text>
                <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>Higher score means safer based on current reports.</Text>
              </View>
              {recommendedRoute ? <StatusPill label={`${recommendedRoute.shortLabel} best`} tone="success" icon="shield-checkmark-outline" /> : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.md, paddingTop: theme.spacing.lg }}>
              {routeOptions.map((option) => (
                <RouteOption
                  key={option.id}
                  option={option}
                  active={selectedRouteMode === option.id}
                  recommended={recommendedRoute?.id === option.id}
                  onPress={() => setSelectedRouteMode(option.id)}
                />
              ))}
            </ScrollView>

            <PredictionMeter
              label={activeRoute ? `${activeRoute.label} safety score` : 'Route safety score'}
              score={activeRoute?.safetyScore || safetyPrediction.safetyScore}
              helper={activeRoute?.warning || safetyPrediction.alternateAdvice}
            />

            <View style={{ marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primaryTint, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Prediction insight</Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>{safetyPrediction.primaryWarning}</Text>
              <Text style={{ color: theme.colors.text, marginTop: 8, lineHeight: 20, fontWeight: '800' }}>Destination goal: {routeGoalDetail.destination}</Text>
            </View>

            <ActionChecklist items={checklist} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
              <PrimaryButton
                title="Auto-pick safest"
                variant="secondary"
                onPress={() => recommendedRoute && setSelectedRouteMode(recommendedRoute.id)}
                disabled={!recommendedRoute}
                style={{ flex: 1, minWidth: '47%' }}
                icon={<Ionicons name="sparkles-outline" size={18} color={theme.colors.text} />}
              />
              <PrimaryButton
                title={routeStarted ? 'Safe mode active' : 'Start safe mode'}
                onPress={() => setRouteStarted(true)}
                style={{ flex: 1, minWidth: '47%' }}
                icon={<Ionicons name="navigate-outline" size={18} color={theme.colors.white} />}
              />
              <PrimaryButton
                title="Live location"
                variant="secondary"
                onPress={() => navigation.navigate('LiveShare')}
                style={{ flex: 1, minWidth: '47%' }}
                icon={<Ionicons name="location-outline" size={18} color={theme.colors.text} />}
              />
              <PrimaryButton
                title="Refresh"
                variant="secondary"
                onPress={loadIncidents}
                loading={loading}
                style={{ flex: 1, minWidth: '47%' }}
                icon={<Ionicons name="refresh-outline" size={18} color={theme.colors.text} />}
              />
            </View>

            {routeStarted ? (
              <InfoBanner
                tone="success"
                title="Safe mode is active"
                message={`Follow ${activeRoute?.label || 'the selected route'}, keep live sharing on, and avoid red danger zones until you reach a safer area.`}
                style={{ marginTop: theme.spacing.md }}
              />
            ) : null}
          </Card>

          <SelectedClusterSheet cluster={selectedCluster} />

          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>Nearby incident cards</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filteredIncidents.slice(0, 12).map((incident) => (
              <NearbyIncidentCard key={incident.id} incident={incident} onPress={() => {
                const match = clusters.find((cluster) => cluster.items.some((item) => item.id === incident.id));
                if (match) setSelectedCluster(match);
              }} />
            ))}
          </ScrollView>

          {selectedClusterItems.length === 0 ? (
            <InfoBanner tone="info" title="Tap a map marker" message="Incident details are shown from map markers instead of a regular post-style feed." style={{ marginTop: theme.spacing.lg }} />
          ) : null}

          {unmappedCount > 0 ? (
            <InfoBanner tone="warning" title="Some reports are missing GPS" message={`${unmappedCount} report(s) do not have coordinates, so they cannot appear as map markers.`} style={{ marginTop: theme.spacing.lg }} />
          ) : null}
        </>
      )}
    </ScreenWrapper>
  );
}
