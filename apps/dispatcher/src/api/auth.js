// src/api/auth.js
import apiClient from './client';

export async function login(phone_number, password) {
  const { data } = await apiClient.post('/auth/login', { phone_number, password });
  return data.data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get('/auth/me');
  return data.data;
}
