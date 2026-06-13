import * as Location from 'expo-location';

import {
  BACKGROUND_LOCATION_TASK,
  isBackgroundTaskRunning,
  startBackgroundLocationTask,
  stopBackgroundLocationTask,
} from './backgroundLocationTask';

export { BACKGROUND_LOCATION_TASK };

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)),
  ]);
}

export async function requestForegroundLocationPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') {
    return current;
  }
  return Location.requestForegroundPermissionsAsync();
}

export async function requestBackgroundLocationPermission() {
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.status === 'granted') {
    return current;
  }
  return Location.requestBackgroundPermissionsAsync();
}

export async function ensureForegroundLocationPermission(reason = 'SafeHer needs your location for this safety action.') {
  const permission = await requestForegroundLocationPermission();
  if (permission.status !== 'granted') {
    throw new Error(reason);
  }
  return permission;
}

export async function getCurrentLocation() {
  return withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      mayShowUserSettingsDialog: true,
    }),
    10000,
    'Location is taking too long. Please move to an open area or enable precise location.'
  );
}

export async function getBestEffortLocation() {
  try {
    return await getCurrentLocation();
  } catch (currentError) {
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 250 });
    if (lastKnown?.coords) {
      return lastKnown;
    }
    throw currentError;
  }
}

export async function getReadableAddress(coords) {
  if (coords?.latitude === undefined || coords?.longitude === undefined) {
    return null;
  }

  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (!address) {
      return null;
    }

    return [address.name, address.street, address.district, address.city, address.region]
      .filter(Boolean)
      .join(', ');
  } catch (_error) {
    return null;
  }
}

export function toLocationPayload(location, source = 'manual') {
  if (!location?.coords) {
    throw new Error('Location unavailable.');
  }

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    source,
  };
}

export async function enableBackgroundTracking() {
  const permission = await requestBackgroundLocationPermission();
  if (permission.status !== 'granted') {
    throw new Error('Background location permission was not granted. Live sharing still works while the app is open.');
  }
  return startBackgroundLocationTask();
}


export async function enableBackgroundTrackingIfPermitted() {
  const permission = await Location.getBackgroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return { started: false, reason: 'Background location permission is not granted yet.' };
  }
  await startBackgroundLocationTask();
  return { started: true };
}

export async function disableBackgroundTracking() {
  return stopBackgroundLocationTask();
}

export async function getBackgroundTrackingState() {
  return isBackgroundTaskRunning();
}
