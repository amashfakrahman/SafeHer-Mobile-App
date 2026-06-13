function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getIncidentSeverity(category) {
  if (category === 'harassment') return 4.5;
  if (category === 'unsafe-area') return 3.8;
  if (category === 'suspicious-activity') return 3.2;
  return 1.6;
}

export function getFreshnessMultiplier(createdAt) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0.5;
  const ageHours = Math.max(1, (Date.now() - created) / 36e5);
  if (ageHours <= 6) return 1.2;
  if (ageHours <= 24) return 1;
  if (ageHours <= 168) return 0.68;
  if (ageHours <= 720) return 0.42;
  return 0.22;
}

export function getTimeRisk(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 22 || hour <= 4) return 16;
  if (hour >= 19 || hour <= 6) return 10;
  return 2;
}

export function isIncidentLocated(incident) {
  return Number.isFinite(Number(incident?.latitude)) && Number.isFinite(Number(incident?.longitude));
}

export function getIncidentRiskScore(incident) {
  return getIncidentSeverity(incident.category) * getFreshnessMultiplier(incident.created_at);
}

export function buildRiskSummary(incidents = []) {
  const located = incidents.filter(isIncidentLocated);
  const critical = located.filter((incident) => ['harassment', 'unsafe-area', 'suspicious-activity'].includes(incident.category));
  const weightedRisk = located.reduce((sum, incident) => sum + getIncidentRiskScore(incident), 0);
  const densityRisk = Math.min(34, located.length * 3.2);
  const severityRisk = Math.min(36, weightedRisk * 2.1);
  const timeRisk = getTimeRisk();
  const totalRisk = clamp(Math.round(densityRisk + severityRisk + timeRisk), 0, 100);

  let level = 'Low';
  if (totalRisk >= 72) level = 'High';
  else if (totalRisk >= 45) level = 'Medium';

  return {
    totalReports: incidents.length,
    locatedReports: located.length,
    criticalReports: critical.length,
    weightedRisk,
    densityRisk,
    severityRisk,
    timeRisk,
    totalRisk,
    level,
  };
}

export function buildRouteOptions(incidents = []) {
  const summary = buildRiskSummary(incidents);
  const risk = summary.totalRisk;

  const safeScore = clamp(Math.round(96 - risk * 0.48), 54, 98);
  const balancedScore = clamp(Math.round(89 - risk * 0.66), 43, 94);
  const fastScore = clamp(Math.round(82 - risk * 0.88), 26, 90);

  return [
    {
      id: 'safe',
      label: 'Safe',
      icon: 'shield-checkmark',
      colorKey: 'success',
      eta: '+6 min',
      risk: safeScore >= 76 ? 'Lowest risk' : 'Safer detour',
      safetyScore: safeScore,
      description: 'Avoids dense report clusters, recent severe incidents, and night-risk zones.',
      reason: `Avoids ${summary.criticalReports} critical report area(s).`,
    },
    {
      id: 'balanced',
      label: 'Balanced',
      icon: 'git-branch',
      colorKey: 'warning',
      eta: '+2 min',
      risk: 'Moderate risk',
      safetyScore: balancedScore,
      description: 'Balances speed with safer public segments around report clusters.',
      reason: 'Recommended when you are not in immediate danger but want a cleaner path.',
    },
    {
      id: 'fast',
      label: 'Fast',
      icon: 'flash',
      colorKey: 'danger',
      eta: 'Fastest',
      risk: fastScore >= 65 ? 'Manageable risk' : 'Higher risk',
      safetyScore: fastScore,
      description: 'Prioritizes shortest route and may pass closer to unsafe reports.',
      reason: 'Use only when speed is more important than avoiding all risk zones.',
    },
  ];
}

export function getRecommendedRoute(incidents = []) {
  return buildRouteOptions(incidents).sort((a, b) => b.safetyScore - a.safetyScore)[0];
}

export function buildUnsafeZoneWarning(incidents = []) {
  const summary = buildRiskSummary(incidents);
  if (summary.totalRisk >= 72) {
    return {
      tone: 'danger',
      title: 'High-risk area detected',
      message: 'Recent nearby reports suggest choosing the Safe route and sharing your location with a trusted contact.',
    };
  }
  if (summary.totalRisk >= 45) {
    return {
      tone: 'warning',
      title: 'Use caution nearby',
      message: 'SafeHer found moderate report density around this area. Balanced or Safe route is recommended.',
    };
  }
  return {
    tone: 'success',
    title: 'Route area looks calmer',
    message: 'Few recent mapped reports were found. Keep live sharing ready if you are travelling alone.',
  };
}

export function getRouteColor(theme, routeMode) {
  if (routeMode === 'safe') return theme.colors.success;
  if (routeMode === 'balanced') return theme.colors.warning;
  return theme.colors.danger;
}
