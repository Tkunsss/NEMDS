// src/api/calls.js
import apiClient from './client';

export async function listCalls(status) {
  const { data } = await apiClient.get('/calls', { params: status ? { status } : {} });
  return data.data;
}

export async function getCall(callId) {
  const { data } = await apiClient.get(`/calls/${callId}`);
  return data.data;
}

export async function updateCallStatus(callId, status, note) {
  const { data } = await apiClient.patch(`/calls/${callId}/status`, { status, note });
  return data.data;
}

export async function getCallerLocation(callId) {
  const { data } = await apiClient.get(`/calls/${callId}/location`);
  return data.data;
}
