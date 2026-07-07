// src/api/ambulances.js
import apiClient from './client';

export async function getAmbulanceLocation(ambulanceId) {
  const { data } = await apiClient.get(`/ambulances/${ambulanceId}/location`);
  return data.data;
}
