// src/api/dispatch.js
import apiClient from './client';

export async function listAmbulances(status) {
  const { data } = await apiClient.get('/ambulances', { params: status ? { status } : {} });
  return data.data;
}

export async function listAvailableAmbulancesWithDriver() {
  const { data } = await apiClient.get('/ambulances', { params: { status: 'available_with_driver' } });
  return data.data;
}

export async function createDispatch({ call_id, ambulance_id, destination_hospital_id, notes }) {
  const { data } = await apiClient.post('/dispatches', { call_id, ambulance_id, destination_hospital_id, notes });
  return data.data;
}

export async function getDispatchForCall(callId) {
  const { data } = await apiClient.get(`/dispatches/call/${callId}`);
  return data.data;
}
