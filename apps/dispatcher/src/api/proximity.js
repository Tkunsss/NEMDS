// src/api/proximity.js
import apiClient from './client';

// Crewed, available ambulances sorted by distance from a call's location.
// Pure backend math against live GPS positions already in our database.
export async function getNearestAmbulances(lat, lng) {
  const { data } = await apiClient.get('/proximity/ambulances', { params: { lat, lng } });
  return data.data;
}

export async function getNearestHospitals(lat, lng) {
  const { data } = await apiClient.get('/proximity/hospitals', { params: { lat, lng } });
  return data.data;
}
