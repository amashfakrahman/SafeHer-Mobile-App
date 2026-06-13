import client from './client';

export async function getEvidenceItems() {
  const response = await client.get('/evidence');
  return response.data.data;
}

export async function uploadEvidence({ title, note, type, file, panicUploaded = false }) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('note', note || '');
  formData.append('type', type);
  formData.append('panicUploaded', panicUploaded ? '1' : '0');

  if (file?.uri) {
    formData.append('file', {
      uri: file.uri,
      name: file.name || `${type}-${Date.now()}`,
      type: file.mimeType || 'application/octet-stream',
    });
  }

  const response = await client.post('/evidence', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

export async function markEvidencePanicUploaded(id) {
  const response = await client.post(`/evidence/${id}/panic-upload`);
  return response.data.data;
}
