// src/api/places.js
import apiClient from './client';

// Calls our backend's Places proxy — the Google Places API key never
// touches this frontend at all.
export async function searchHospitalsByText(query, biasLat, biasLng) {
  const params = { query };
  if (biasLat && biasLng) {
    params.lat = biasLat;
    params.lng = biasLng;
  }
  const { data } = await apiClient.get('/places/search-hospitals', { params });
  return data.data;
}
