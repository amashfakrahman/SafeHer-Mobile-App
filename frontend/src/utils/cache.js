import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getCachedValue(key, fallback = null) {
  const rawValue = await AsyncStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return fallback;
  }
}

export async function setCachedValue(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeCachedValue(key) {
  await AsyncStorage.removeItem(key);
}
