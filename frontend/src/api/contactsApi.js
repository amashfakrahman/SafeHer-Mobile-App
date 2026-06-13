import client from './client';

export async function getContacts() {
  const response = await client.get('/contacts');
  return response.data.data;
}

export async function createContact(payload) {
  const response = await client.post('/contacts', payload);
  return response.data.data;
}

export async function updateContact(contactId, payload) {
  const response = await client.put(`/contacts/${contactId}`, payload);
  return response.data.data;
}

export async function deleteContact(contactId) {
  const response = await client.delete(`/contacts/${contactId}`);
  return response.data;
}
