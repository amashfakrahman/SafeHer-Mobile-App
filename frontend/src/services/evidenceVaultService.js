import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '../constants/storage';

const VAULT_DIR = `${FileSystem.documentDirectory}safeher-vault/`;
const VAULT_SECRET_KEY = 'safeher.vault.secret';

function getExtension(uri = '', type = 'note') {
  const match = String(uri).match(/\.([a-zA-Z0-9]+)(\?|#|$)/);
  if (match) return match[1].toLowerCase();
  if (type === 'photo') return 'jpg';
  if (type === 'video') return 'mp4';
  if (type === 'audio') return 'm4a';
  return 'txt';
}

export async function ensureVaultReady() {
  const info = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
  const existing = await SecureStore.getItemAsync(VAULT_SECRET_KEY);
  if (!existing) {
    await SecureStore.setItemAsync(VAULT_SECRET_KEY, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }
}

export async function copyFileIntoVault(uri, type) {
  await ensureVaultReady();
  const extension = getExtension(uri, type);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const destination = `${VAULT_DIR}${id}.${extension}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export async function getLocalVaultItems() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.vaultItems);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return [];
  }
}

export async function saveLocalVaultItems(items) {
  await AsyncStorage.setItem(STORAGE_KEYS.vaultItems, JSON.stringify(items));
}

export async function addLocalVaultItem(item) {
  const items = await getLocalVaultItems();
  const next = [{ ...item, id: item.id || `${Date.now()}` }, ...items];
  await saveLocalVaultItems(next);
  return next[0];
}

export async function updateLocalVaultItem(id, patch) {
  const items = await getLocalVaultItems();
  const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  await saveLocalVaultItems(next);
  return next;
}
