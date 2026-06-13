import client from './client';

export async function login(payload) {
  const response = await client.post('/auth/login', payload);
  return response.data.data;
}

export async function register(payload) {
  const response = await client.post('/auth/register', payload);
  return response.data.data;
}

export async function getProfile() {
  const response = await client.get('/auth/me');
  return response.data.data;
}

export async function updateProfile(payload) {
  const response = await client.put('/auth/profile', payload);
  return response.data.data;
}

export async function updateSettings(payload) {
  const response = await client.put('/auth/settings', payload);
  return response.data.data;
}
