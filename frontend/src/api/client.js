import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getStoredToken } from '../services/authStorage';

const BACKEND_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT || '5000';
const RAW_ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

function normalizeBaseUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function extractHost(value) {
  if (!value) return null;
  const raw = String(value).replace(/^https?:\/\//, '');
  const host = raw.split('/')[0].split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function getExpoDevelopmentHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.manifest?.debuggerHost,
    Constants.manifest?.hostUri,
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host) return host;
  }
  return null;
}

function looksLikeLocalhost(url) {
  return /localhost|127\.0\.0\.1/.test(String(url || ''));
}

function resolveApiBaseUrl() {
  const envUrl = normalizeBaseUrl(RAW_ENV_API_URL);

  if (__DEV__) {
    const expoHost = getExpoDevelopmentHost();
    if (expoHost && (!envUrl || looksLikeLocalhost(envUrl))) {
      return `http://${expoHost}:${BACKEND_PORT}/api`;
    }

    if (envUrl) return envUrl;

    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${BACKEND_PORT}/api`;
    }
  }

  return envUrl || `http://127.0.0.1:${BACKEND_PORT}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

if (__DEV__) {
  console.log(`[SafeHer] API base URL: ${API_BASE_URL}`);
}

const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ECONNABORTED') return 'The request took too long. Check your connection and try again.';
  if (error.message === 'Network Error') {
    return `Unable to reach SafeHer services at ${API_ORIGIN}. Start the backend, keep your phone and computer on the same WiFi, and allow port ${BACKEND_PORT} through the firewall.`;
  }
  return error.message || fallback;
}

export function isOfflineError(error) {
  return !error?.response && (error?.message === 'Network Error' || error?.code === 'ECONNABORTED');
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 18000,
  headers: {
    Accept: 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const method = (config.method || 'get').toLowerCase();
    const status = error.response?.status;
    const shouldRetry =
      config.retry !== false &&
      RETRYABLE_METHODS.has(method) &&
      (status ? RETRYABLE_STATUS_CODES.has(status) : true) &&
      (config.__retryCount || 0) < 2;

    if (!shouldRetry) {
      return Promise.reject(error);
    }

    config.__retryCount = (config.__retryCount || 0) + 1;
    await delay(450 * config.__retryCount);
    return client(config);
  }
);

export default client;
