import { API_BASE_URL } from '../api/client';

function originFromUrl(url) {
  const match = String(url || '').match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : '';
}

export function normalizePrivateShareUrl(url) {
  if (!url) return '';
  const apiOrigin = originFromUrl(API_BASE_URL);
  if (!apiOrigin) return url;
  return String(url).replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, apiOrigin);
}

export function getTokenFromShareUrl(url) {
  const match = String(url || '').match(/\/api\/public\/share\/([^/?#]+)/);
  return match ? match[1] : '';
}
