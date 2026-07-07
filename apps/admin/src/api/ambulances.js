// src/api/ambulances.js
import apiClient from './client';

export async function listAmbulances() {
  const { data } = await apiClient.get('/ambulances');
  return data.data;
}

export async function createAmbulance(payload) {
  const { data } = await apiClient.post('/ambulances', payload);
  return data.data;
}

export async function deleteAmbulance(ambulanceId) {
  const { data } = await apiClient.delete(`/ambulances/${ambulanceId}`);
  return data;
}
