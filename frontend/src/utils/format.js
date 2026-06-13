import { API_ORIGIN } from '../api/client';

export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return 'Distance unavailable';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

export function getAssetUrl(relativePath) {
  if (!relativePath) {
    return null;
  }

  if (/^https?:\/\//.test(relativePath)) {
    return relativePath;
  }

  return `${API_ORIGIN}${relativePath}`;
}

export function formatCoordinates(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return 'Unavailable';
  }

  return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
}
