import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { STORAGE_KEYS } from '../constants/storage';

export const BACKGROUND_LOCATION_TASK = 'safeher-background-location';

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      return;
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      return;
    }

    const authToken = await AsyncStorage.getItem(STORAGE_KEYS.authTokenCache);
    const shareRaw = await AsyncStorage.getItem(STORAGE_KEYS.activeShare);
    let activeShare = null;
    try {
      activeShare = shareRaw ? JSON.parse(shareRaw) : null;
    } catch (_parseError) {
      activeShare = null;
    }

    if (!authToken || !activeShare?.id || !data?.locations?.length) {
      return;
    }

    const latestLocation = data.locations[data.locations.length - 1];
    const payload = {
      latitude: latestLocation.coords.latitude,
      longitude: latestLocation.coords.longitude,
      accuracy: latestLocation.coords.accuracy,
      source: 'background-task',
    };

    try {
      await fetch(`${apiUrl}/location/share/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (_networkError) {
      // Best effort only. Background updates should never crash the task.
    }
  });
}

export async function startBackgroundLocationTask() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (hasStarted) {
    return true;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'SafeHer location sharing is active',
      notificationBody: 'Your live location is being updated in the background.',
    },
  });

  return true;
}

export async function stopBackgroundLocationTask() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (!hasStarted) {
    return true;
  }

  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  return true;
}

export async function isBackgroundTaskRunning() {
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
