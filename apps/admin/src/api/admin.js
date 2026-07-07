// src/api/admin.js
import apiClient from './client';

export async function getStats() {
  const { data } = await apiClient.get('/admin/stats');
  return data.data;
}

export async function listUsers(role) {
  const { data } = await apiClient.get('/admin/users', { params: role ? { role } : {} });
  return data.data;
}

export async function createStaffUser(payload) {
  const { data } = await apiClient.post('/admin/users', payload);
  return data.data;
}

export async function updateUser(userId, payload) {
  const { data } = await apiClient.patch(`/admin/users/${userId}`, payload);
  return data.data;
}

export async function deactivateUser(userId) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/deactivate`);
  return data;
}

export async function reactivateUser(userId) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/reactivate`);
  return data;
}

export async function deleteUser(userId) {
  const { data } = await apiClient.delete(`/admin/users/${userId}`);
  return data;
}

export async function getSystemRecords(limit = 50, offset = 0) {
  const { data } = await apiClient.get('/admin/records', { params: { limit, offset } });
  return data;
}

// Calls that couldn't be auto-routed to any hospital (e.g. no hospital had
// coordinates yet at submission time) — surfaced so they never silently
// vanish unseen by any dispatcher.
export async function getUnassignedCalls() {
  const { data } = await apiClient.get('/calls/unassigned');
  return data.data;
}

export async function listHospitals() {
  const { data } = await apiClient.get('/admin/hospitals');
  return data.data;
}

export async function createHospital(payload) {
  const { data } = await apiClient.post('/admin/hospitals', payload);
  return data.data;
}

export async function deleteHospital(hospitalId) {
  const { data } = await apiClient.delete(`/admin/hospitals/${hospitalId}`);
  return data;
}
