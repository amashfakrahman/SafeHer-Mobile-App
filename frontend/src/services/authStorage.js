import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '../constants/storage';

async function safeSecureSet(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (_error) {
    await AsyncStorage.setItem(key, value);
  }
}

async function safeSecureGet(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (_error) {
    return AsyncStorage.getItem(key);
  }
}

async function safeSecureDelete(key) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (_error) {
    await AsyncStorage.removeItem(key);
  }
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

export async function setStoredSession({ token, user }) {
  if (token) {
    await safeSecureSet(STORAGE_KEYS.authToken, token);
    await AsyncStorage.setItem(STORAGE_KEYS.authTokenCache, token);
  }

  if (user) {
    await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  }
}

export async function getStoredSession() {
  const [secureToken, cachedToken, cachedUser] = await Promise.all([
    safeSecureGet(STORAGE_KEYS.authToken),
    AsyncStorage.getItem(STORAGE_KEYS.authTokenCache),
    AsyncStorage.getItem(STORAGE_KEYS.currentUser),
  ]);

  return {
    token: secureToken || cachedToken || null,
    user: safeJsonParse(cachedUser),
  };
}

export async function getStoredToken() {
  const session = await getStoredSession();
  return session.token;
}

export async function clearStoredSession() {
  await safeSecureDelete(STORAGE_KEYS.authToken);
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.authTokenCache,
    STORAGE_KEYS.currentUser,
    STORAGE_KEYS.activeShare,
  ]);
}
