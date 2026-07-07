// src/api/driverAssignments.js
import apiClient from './client';

export async function listCurrentAssignments() {
  const { data } = await apiClient.get('/driver-assignments');
  return data.data;
}

export async function listAvailableDrivers() {
  const { data } = await apiClient.get('/driver-assignments/available-drivers');
  return data.data;
}

export async function assignDriver(user_id, ambulance_id) {
  const { data } = await apiClient.post('/driver-assignments', { user_id, ambulance_id });
  return data.data;
}

export async function unassignDriver(ambulanceId) {
  const { data } = await apiClient.delete(`/driver-assignments/ambulance/${ambulanceId}`);
  return data;
}
