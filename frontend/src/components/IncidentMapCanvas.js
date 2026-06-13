import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { buildRouteOptions as buildSafetyRouteOptions, getIncidentSeverity, getRouteColor } from '../services/safetyPredictionService';

const CATEGORY_ICON = {
  harassment: 'alert-circle',
  'unsafe-area': 'warning',
  'suspicious-activity': 'eye',
  general: 'pin',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPointBounds(items) {
  const latitudes = items.map((item) => Number(item.latitude)).filter(Number.isFinite);
  const longitudes = items.map((item) => Number(item.longitude)).filter(Number.isFinite);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  return {
    minLat: minLat === maxLat ? minLat - 0.01 : minLat,
    maxLat: minLat === maxLat ? maxLat + 0.01 : maxLat,
    minLng: minLng === maxLng ? minLng - 0.01 : minLng,
    maxLng: minLng === maxLng ? maxLng + 0.01 : maxLng,
  };
}

function normalizePoint(item, bounds) {
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100;
  return { ...item, x: clamp(x, 8, 92), y: clamp(y, 12, 88) };
}

function buildClusters(points) {
  const clusters = [];
  points.forEach((point) => {
    const match = clusters.find((cluster) => {
      const distance = Math.sqrt(Math.pow(cluster.x - point.x, 2) + Math.pow(cluster.y - point.y, 2));
      return distance < 13;
    });

    if (match) {
      match.items.push(point);
      match.x = match.items.reduce((sum, item) => sum + item.x, 0) / match.items.length;
      match.y = match.items.reduce((sum, item) => sum + item.y, 0) / match.items.length;
      match.weight += getIncidentSeverity(point.category);
    } else {
      clusters.push({ id: `cluster-${point.id}`, x: point.x, y: point.y, items: [point], weight: getIncidentSeverity(point.category) });
    }
  });
  return clusters;
}

export function getIncidentClusters(incidents = []) {
  const points = incidents.filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));
  if (points.length === 0) return [];
  const bounds = getPointBounds(points);
  return buildClusters(points.map((item) => normalizePoint(item, bounds)));
}

export function buildRouteOptions(incidents = []) {
  return buildSafetyRouteOptions(incidents);
}

function RouteSegment({ routeMode, index }) {
  const { theme } = useTheme();
  const color = getRouteColor(theme, routeMode);
  const segments = {
    safe: [
      { left: '9%', top: '70%', width: '28%', rotate: '-16deg' },
      { left: '34%', top: '58%', width: '26%', rotate: '-28deg' },
      { left: '57%', top: '44%', width: '31%', rotate: '-8deg' },
    ],
    balanced: [
      { left: '10%', top: '62%', width: '35%', rotate: '-4deg' },
      { left: '42%', top: '51%', width: '25%', rotate: '-28deg' },
      { left: '62%', top: '39%', width: '26%', rotate: '8deg' },
    ],
    fast: [
      { left: '11%', top: '36%', width: '36%', rotate: '6deg' },
      { left: '44%', top: '43%', width: '22%', rotate: '16deg' },
      { left: '63%', top: '51%', width: '24%', rotate: '-4deg' },
    ],
  };
  const segment = segments[routeMode]?.[index];
  if (!segment) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: segment.left,
        top: segment.top,
        width: segment.width,
        height: 8,
        borderRadius: 999,
        backgroundColor: color,
        transform: [{ rotate: segment.rotate }],
        opacity: 0.92,
      }}
    />
  );
}


function RouteEndpointMarker({ type }) {
  const { theme } = useTheme();
  const isStart = type === 'start';
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: isStart ? '9%' : '88%',
        top: isStart ? '72%' : '40%',
        width: 44,
        height: 44,
        marginLeft: -22,
        marginTop: -22,
        borderRadius: 22,
        backgroundColor: isStart ? theme.colors.info : theme.colors.success,
        borderWidth: 4,
        borderColor: theme.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.softShadow,
      }}
    >
      <Ionicons name={isStart ? 'person' : 'flag'} size={19} color={theme.colors.white} />
    </View>
  );
}

function SafeHubHalo({ left, top, label }) {
  const { theme } = useTheme();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top }}>
      <View style={{ width: 92, height: 92, marginLeft: -46, marginTop: -46, borderRadius: 46, backgroundColor: theme.colors.success, opacity: 0.12 }} />
      <View style={{ position: 'absolute', left: -15, top: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.colors.white }}>
        <Ionicons name="medkit" size={14} color={theme.colors.white} />
      </View>
      <View style={{ position: 'absolute', left: 22, top: -14, backgroundColor: theme.colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border }}>
        <Text style={{ color: theme.colors.success, fontWeight: '900', fontSize: 10 }}>{label}</Text>
      </View>
    </View>
  );
}

export function IncidentMapCanvas({ incidents = [], selectedClusterId, onSelectCluster, routeMode = 'safe', routeOption = null }) {
  const { theme } = useTheme();
  const clusters = useMemo(() => getIncidentClusters(incidents), [incidents]);
  const routeLabel = routeMode === 'safe' ? 'Safe route' : routeMode === 'balanced' ? 'Balanced route' : 'Fast route';
  const routeColor = getRouteColor(theme, routeMode);

  return (
    <View style={{ height: 448, borderRadius: theme.radius.xxl, overflow: 'hidden', backgroundColor: theme.colors.primaryTint, borderWidth: 1, borderColor: theme.colors.border, ...theme.softShadow }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.mode === 'dark' ? theme.colors.backgroundAlt : '#FFF5F5' }} />

      {[54, 152, 258, 352].map((top) => (
        <View key={`h-${top}`} pointerEvents="none" style={{ position: 'absolute', left: 18, right: 18, top, height: 1, backgroundColor: theme.colors.border }} />
      ))}
      {[76, 176, 278].map((left) => (
        <View key={`v-${left}`} pointerEvents="none" style={{ position: 'absolute', top: 18, bottom: 18, left, width: 1, backgroundColor: theme.colors.border }} />
      ))}

      <View pointerEvents="none" style={{ position: 'absolute', left: '6%', top: '19%', width: 170, height: 76, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(249,42,42,0.13)', transform: [{ rotate: '-18deg' }] }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: '7%', bottom: '28%', width: 150, height: 66, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)', transform: [{ rotate: '16deg' }] }} />

      {[0, 1, 2].map((index) => <RouteSegment key={index} routeMode={routeMode} index={index} />)}
      <SafeHubHalo left="24%" top="22%" label="Help" />
      <SafeHubHalo left="77%" top="76%" label="Safe" />
      <RouteEndpointMarker type="start" />
      <RouteEndpointMarker type="destination" />

      {clusters.map((cluster) => {
        const size = clamp(90 + cluster.weight * 8, 96, 210);
        const opacity = clamp(0.10 + cluster.items.length * 0.045 + cluster.weight * 0.008, 0.12, 0.32);
        return (
          <View
            key={`heat-${cluster.id}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${cluster.x}%`,
              top: `${cluster.y}%`,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: size / 2,
              backgroundColor: theme.colors.danger,
              opacity,
            }}
          />
        );
      })}

      {clusters.map((cluster) => {
        const selected = selectedClusterId === cluster.id;
        const representative = cluster.items[0];
        const markerSize = cluster.items.length > 1 ? 62 : 50;
        return (
          <Pressable
            key={cluster.id}
            onPress={() => onSelectCluster?.(cluster)}
            accessibilityRole="button"
            accessibilityLabel={`${cluster.items.length} incident marker`}
            style={({ pressed }) => ({
              position: 'absolute',
              left: `${cluster.x}%`,
              top: `${cluster.y}%`,
              width: markerSize,
              height: markerSize,
              marginLeft: -markerSize / 2,
              marginTop: -markerSize / 2,
              borderRadius: markerSize / 2,
              backgroundColor: selected || pressed ? theme.colors.black : theme.colors.white,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: theme.colors.primary,
              shadowColor: theme.colors.shadow,
              shadowOpacity: 1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            })}
          >
            {cluster.items.length > 1 ? (
              <Text style={{ color: selected ? theme.colors.white : theme.colors.primary, fontWeight: '900', fontSize: 19 }}>{cluster.items.length}</Text>
            ) : (
              <Ionicons name={CATEGORY_ICON[representative.category] || 'pin'} size={24} color={selected ? theme.colors.white : theme.colors.primary} />
            )}
          </Pressable>
        );
      })}

      <View style={{ position: 'absolute', left: theme.spacing.md, right: theme.spacing.md, top: theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Ionicons name="flame-outline" size={16} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Unsafe heat zones</Text>
        </View>
        <View style={{ backgroundColor: routeColor, borderRadius: theme.radius.pill, paddingHorizontal: 13, paddingVertical: 9 }}>
          <Text style={{ color: theme.colors.white, fontWeight: '900' }}>{routeLabel}</Text>
        </View>
      </View>

      <View style={{ position: 'absolute', left: theme.spacing.md, right: theme.spacing.md, bottom: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{clusters.length} active map cluster(s)</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 4, lineHeight: 18 }}>Tap markers to view reports. Red halos show risk zones. Green halos show safer help areas.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>{routeOption ? <Text style={{ color: routeColor, fontWeight: '900', fontSize: 22 }}>{routeOption.safetyScore}</Text> : null}<Ionicons name="navigate-circle" size={34} color={routeColor} /></View>
        </View>
      </View>
    </View>
  );
}
