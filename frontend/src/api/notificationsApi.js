import client from './client';

export async function getNotifications() {
  const response = await client.get('/notifications');
  return response.data.data;
}

export async function registerDeviceToken(payload) {
  const response = await client.post('/notifications/device', payload);
  return response.data;
}

export async function sendTestNotification(payload) {
  const response = await client.post('/notifications/test', payload);
  return response.data.data;
}
