const CATEGORY_RISK_WEIGHT = {
  harassment: 4.8,
  'unsafe-area': 4.2,
  'suspicious-activity': 3.6,
  general: 1.7,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getAgeHours(item, nowMs = Date.now()) {
  const created = new Date(item.created_at).getTime();
  if (!Number.isFinite(created)) return 72;
  return Math.max(0.25, (nowMs - created) / 36e5);
}

export function getCategoryRisk(category) {
  return CATEGORY_RISK_WEIGHT[category] || CATEGORY_RISK_WEIGHT.general;
}

export function getIncidentRiskScore(incident, nowMs = Date.now()) {
  const ageHours = getAgeHours(incident, nowMs);
  const freshnessMultiplier = ageHours <= 6 ? 1.25 : ageHours <= 24 ? 1 : ageHours <= 168 ? 0.66 : 0.38;
  return getCategoryRisk(incident.category) * freshnessMultiplier;
}

export function getLocatedIncidents(incidents = []) {
  return incidents.filter((item) => toNumber(item.latitude) !== null && toNumber(item.longitude) !== null);
}

function getPointBounds(items) {
  const latitudes = items.map((item) => toNumber(item.latitude)).filter((item) => item !== null);
  const longitudes = items.map((item) => toNumber(item.longitude)).filter((item) => item !== null);

  if (latitudes.length === 0 || longitudes.length === 0) {
    return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  }

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

function normalizePoint(item, bounds, nowMs = Date.now()) {
  const lat = toNumber(item.latitude);
  const lng = toNumber(item.longitude);
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100;
  return {
    ...item,
    x: clamp(x, 8, 92),
    y: clamp(y, 12, 88),
    riskScore: getIncidentRiskScore(item, nowMs),
  };
}

function buildClusters(points) {
  const clusters = [];

  points.forEach((point) => {
    const match = clusters.find((cluster) => {
      const distance = Math.sqrt(Math.pow(cluster.x - point.x, 2) + Math.pow(cluster.y - point.y, 2));
      return distance < 12;
    });

    if (match) {
      match.items.push(point);
      match.x = match.items.reduce((sum, item) => sum + item.x, 0) / match.items.length;
      match.y = match.items.reduce((sum, item) => sum + item.y, 0) / match.items.length;
      match.riskScore += point.riskScore;
      match.dominantCategory = getDominantCategory(match.items);
    } else {
      clusters.push({
        id: `cluster-${point.id}`,
        x: point.x,
        y: point.y,
        items: [point],
        riskScore: point.riskScore,
        dominantCategory: point.category,
      });
    }
  });

  return clusters.sort((a, b) => b.riskScore - a.riskScore);
}

function getDominantCategory(items) {
  const counts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + getCategoryRisk(item.category);
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
}

export function getIncidentClusters(incidents = []) {
  const located = getLocatedIncidents(incidents);
  if (located.length === 0) return [];
  const bounds = getPointBounds(located);
  const nowMs = Date.now();
  return buildClusters(located.map((item) => normalizePoint(item, bounds, nowMs)));
}

export function buildSafetyPrediction(incidents = []) {
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour <= 5;
  const located = getLocatedIncidents(incidents);
  const clusters = getIncidentClusters(located);
  const recent = located.filter((item) => getAgeHours(item, now.getTime()) <= 24);
  const severe = located.filter((item) => getCategoryRisk(item.category) >= 3.6);
  const weightedRisk = located.reduce((sum, item) => sum + getIncidentRiskScore(item, now.getTime()), 0);
  const densityRisk = Math.min(34, clusters.reduce((sum, cluster) => sum + Math.min(8, cluster.items.length * 2.2), 0));
  const recencyRisk = Math.min(22, recent.length * 4.5);
  const severityRisk = Math.min(26, severe.length * 4);
  const nightRisk = isNight ? 12 : 0;
  const riskIndex = clamp(Math.round(weightedRisk * 1.8 + densityRisk + recencyRisk + severityRisk + nightRisk), 0, 100);
  const safetyScore = clamp(100 - riskIndex, 12, 98);
  const topCluster = clusters[0] || null;
  const confidence = located.length >= 8 ? 'High' : located.length >= 3 ? 'Medium' : 'Low';

  const primaryWarning = topCluster
    ? `${topCluster.items.length} report${topCluster.items.length > 1 ? 's' : ''} clustered near one area. Dominant signal: ${String(topCluster.dominantCategory || 'general').replace('-', ' ')}.`
    : 'No mapped reports in this filter yet. Use current GPS reports for stronger predictions.';

  const alternateAdvice = riskIndex >= 65
    ? 'Choose Safe Route and avoid dense red zones. Travel with public roads and trusted contacts tracking.'
    : riskIndex >= 38
      ? 'Balanced Route is acceptable, but keep live sharing on and avoid marker clusters.'
      : 'Fast Route looks reasonable now; keep SOS and live share ready for unexpected changes.';

  return {
    generatedAt: now.toISOString(),
    locatedCount: located.length,
    clusterCount: clusters.length,
    recentCount: recent.length,
    severeCount: severe.length,
    isNight,
    riskIndex,
    safetyScore,
    confidence,
    topCluster,
    primaryWarning,
    alternateAdvice,
  };
}

export function buildRouteOptions(incidents = []) {
  const prediction = buildSafetyPrediction(incidents);
  const risk = prediction.riskIndex;
  const nightLabel = prediction.isNight ? 'Night travel active' : 'Day route';

  return [
    {
      id: 'safe',
      label: 'Safe Route',
      shortLabel: 'Safe',
      icon: 'shield-checkmark',
      eta: '+6 min',
      risk: 'Lowest risk',
      tone: 'success',
      routeColorKey: 'success',
      safetyScore: clamp(Math.round(96 - risk * 0.42), 55, 98),
      confidence: prediction.confidence,
      description: 'Avoids report clusters, favors open public roads, and keeps distance from heat zones.',
      reasons: ['Avoids unsafe halos', 'Better for night travel', nightLabel],
      warning: risk >= 55 ? 'Recommended now because nearby reports are dense or recent.' : 'Best for cautious travel with minimal exposure.',
    },
    {
      id: 'balanced',
      label: 'Balanced Route',
      shortLabel: 'Balanced',
      icon: 'git-branch',
      eta: '+2 min',
      risk: 'Medium risk',
      tone: 'warning',
      routeColorKey: 'warning',
      safetyScore: clamp(Math.round(88 - risk * 0.62), 42, 94),
      confidence: prediction.confidence,
      description: 'Balances travel time with incident density and keeps moderate distance from risky clusters.',
      reasons: ['Moderate detour', 'Avoids highest risk', `${prediction.recentCount} recent reports`],
      warning: risk >= 65 ? 'Use only if time matters. Some recent report zones may remain nearby.' : 'A practical route when you need speed and awareness.',
    },
    {
      id: 'fast',
      label: 'Fast Route',
      shortLabel: 'Fast',
      icon: 'flash',
      eta: 'Fastest',
      risk: 'Higher risk',
      tone: 'danger',
      routeColorKey: 'danger',
      safetyScore: clamp(Math.round(78 - risk * 0.9), 18, 88),
      confidence: prediction.confidence,
      description: 'Shortest path, but may pass near unsafe markers or recent suspicious-area reports.',
      reasons: ['Shortest time', 'More exposure', prediction.isNight ? 'Night penalty' : 'Daylight advantage'],
      warning: risk >= 45 ? 'Not recommended while unsafe zones are active nearby.' : 'Acceptable only when conditions look calm.',
    },
  ];
}

export function getRouteOption(routeOptions = [], selectedId = 'safe') {
  return routeOptions.find((option) => option.id === selectedId) || routeOptions[0] || null;
}
