// src/api/ambulances.js
import apiClient from './client';

export async function listAmbulances() {
  const { data } = await apiClient.get('/ambulances');
  return data.data;
}

export async function listDeletedAmbulances(hours = 24) {
  const { data } = await apiClient.get('/ambulances/deleted', { params: { hours } });
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

export async function restoreAmbulance(ambulanceId) {
  const { data } = await apiClient.post(`/ambulances/${ambulanceId}/restore`);
  return data;
}

export async function permanentDeleteAmbulance(ambulanceId) {
  const { data } = await apiClient.delete(`/ambulances/${ambulanceId}/permanent`);
  return data;
}
