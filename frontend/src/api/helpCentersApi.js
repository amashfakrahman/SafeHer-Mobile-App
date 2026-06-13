import client from './client';

export async function getHelpCenters(params = {}) {
  const response = await client.get('/help-centers', { params });
  return response.data.data;
}
