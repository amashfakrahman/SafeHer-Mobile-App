import client from './client';

export async function getLatestLocation() {
  const response = await client.get('/location/current');
  return response.data.data;
}

export async function postCurrentLocation(payload) {
  const response = await client.post('/location/current', payload);
  return response.data.data;
}

export async function getActiveShare() {
  const response = await client.get('/location/share/active');
  return response.data.data;
}

export async function startShare(payload) {
  const response = await client.post('/location/share/start', payload);
  return response.data.data;
}

export async function updateShare(payload) {
  const response = await client.post('/location/share/update', payload);
  return response.data.data;
}

export async function stopShare() {
  const response = await client.post('/location/share/stop');
  return response.data;
}

export async function triggerSos(payload) {
  const response = await client.post('/location/sos', payload);
  return response.data.data;
}

export async function getPublicShare(token) {
  const response = await client.get(`/public/share/${token}`);
  return response.data.data;
}
