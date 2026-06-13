/**
 * Expo Go-safe notification facade.
 *
 * Remote push notifications were removed because Expo Go on Android crashes when
 * remote push APIs from expo-notifications are loaded in SDK 53+. The backend
 * still records in-app notification history and SOS delivery attempts. This
 * module intentionally does not import expo-notifications.
 */

export async function registerForPushNotificationsAsync() {
  return {
    expoPushToken: null,
    permissionStatus: 'unavailable',
    warning: 'Remote push is disabled in this Expo Go-safe build. SafeHer still records SOS and alert history in the backend.',
    isExpoGo: true,
  };
}

export function addNotificationListeners() {
  return () => {};
}

export function addSafePushTokenListener() {
  return () => {};
}

export async function scheduleLocalNotification({ title, body, data = {}, seconds = 1 } = {}) {
  console.log('In-app notification event:', { title, body, data, seconds });
  return null;
}
