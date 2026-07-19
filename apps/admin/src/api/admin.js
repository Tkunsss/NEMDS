// src/api/admin.js
import apiClient from './client';

export async function getStats() {
  const { data } = await apiClient.get('/admin/stats');
  return data.data;
}

export async function listUsers(query = '', role) {
  const params = {};
  if (query) params.q = query;
  if (role) params.role = role;
  const { data } = await apiClient.get('/admin/users', { params });
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

export async function restoreUser(userId) {
  const { data } = await apiClient.post(`/admin/users/${userId}/restore`);
  return data;
}

export async function permanentDeleteUser(userId) {
  const { data } = await apiClient.delete(`/admin/users/${userId}/permanent`);
  return data;
}

export async function getSystemRecords(limit = 50, offset = 0) {
  try {
    const { data } = await apiClient.get('/admin/records', { params: { limit, offset } });
    return data || { success: true, data: [], meta: { total: 0 } };
  } catch (err) {
    return { success: false, data: [], meta: { total: 0 }, message: err.response?.data?.message || 'Unable to load system records' };
  }
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

export async function restoreHospital(hospitalId) {
  const { data } = await apiClient.post(`/admin/hospitals/${hospitalId}/restore`);
  return data;
}

export async function permanentDeleteHospital(hospitalId) {
  const { data } = await apiClient.delete(`/admin/hospitals/${hospitalId}/permanent`);
  return data;
}

export async function listRecentlyRemoved(hours = 24) {
  try {
    const { data } = await apiClient.get('/admin/recently-removed', { params: { hours } });
    return data.data || [];
  } catch (err) {
    if (err.response?.status === 404) {
      return [];
    }
    throw err;
  }
}
