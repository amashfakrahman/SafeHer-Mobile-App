import client from './client';

export async function getCommunityPosts(category = 'all') {
  const response = await client.get('/community/posts', { params: { category } });
  return response.data.data;
}

export async function createCommunityPost(payload) {
  const response = await client.post('/community/posts', payload);
  return response.data.data;
}

export async function togglePostLike(id) {
  const response = await client.post(`/community/posts/${id}/like`);
  return response.data.data;
}

export async function getPostComments(id) {
  const response = await client.get(`/community/posts/${id}/comments`);
  return response.data.data;
}

export async function createPostComment(id, payload) {
  const response = await client.post(`/community/posts/${id}/comments`, payload);
  return response.data.data;
}

export async function recordPostShare(id) {
  const response = await client.post(`/community/posts/${id}/share`);
  return response.data.data;
}

export async function reportPost(id, payload = { reason: 'other' }) {
  const body = typeof payload === 'string' ? { reason: payload } : payload;
  const response = await client.post(`/community/posts/${id}/report`, body);
  return response.data.data;
}
