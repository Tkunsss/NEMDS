// src/api/calls.js
import apiClient from './client';

export async function submitEmergencyCall(payload) {
  const { data } = await apiClient.post('/calls', payload);
  return data.data; // { call_id, emergency_id, ...full call record }
}

// Accepts either a numeric call_id or an emergency_id string — backend handles both
export async function getCallById(idOrEmergencyId) {
  const { data } = await apiClient.get(`/calls/${idOrEmergencyId}`);
  return data.data;
}

export async function getCallHistory(emergencyIds) {
  if (!emergencyIds || emergencyIds.length === 0) return [];
  const { data } = await apiClient.get('/calls/mine', { params: { ids: emergencyIds.join(',') } });
  return data.data;
}

export async function cancelEmergencyCall(callId) {
  const { data } = await apiClient.patch(`/calls/${callId}/cancel`);
  return data;
}

export async function getDispatchForCall(callId) {
  try {
    const { data } = await apiClient.get(`/dispatches/call/${callId}`);
    return data.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function getAmbulanceLocation(callId) {
  const { data } = await apiClient.get(`/tracking/call/${callId}`);
  return data.data;
}

// Streams the caller's live position after submission
export async function sendLocationPing(callId, latitude, longitude, accuracy_meters) {
  const { data } = await apiClient.post(`/calls/${callId}/location`, { latitude, longitude, accuracy_meters });
  return data;
}
