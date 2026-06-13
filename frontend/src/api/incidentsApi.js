import client from './client';

export async function getIncidents() {
  const response = await client.get('/incidents');
  return response.data.data;
}

export async function createIncident(formData) {
  const response = await client.post('/incidents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
}
