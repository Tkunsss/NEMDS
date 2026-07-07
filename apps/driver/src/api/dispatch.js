// src/api/dispatch.js
import apiClient from './client';

export async function getActiveDispatch() {
  const { data } = await apiClient.get('/dispatches/active');
  return data.data;
}

export async function markEnRoute(dispatchId) {
  const { data } = await apiClient.patch(`/dispatches/${dispatchId}/en-route`);
  return data.data;
}

export async function markArrivedScene(dispatchId) {
  const { data } = await apiClient.patch(`/dispatches/${dispatchId}/arrived-scene`);
  return data.data;
}

export async function markDepartedScene(dispatchId) {
  const { data } = await apiClient.patch(`/dispatches/${dispatchId}/departed-scene`);
  return data.data;
}

export async function markArrivedHospital(dispatchId) {
  const { data } = await apiClient.patch(`/dispatches/${dispatchId}/arrived-hospital`);
  return data.data;
}

export async function getMyAmbulance() {
  const { data } = await apiClient.get('/ambulances/my');
  return data.data;
}

export async function getCallerLocation(callId) {
  const { data } = await apiClient.get(`/calls/${callId}/location`);
  return data.data;
}

export async function getActiveDispatchWithDestination() {
  const { data } = await apiClient.get('/dispatches/active');
  return data.data;
}

export async function updateAmbulanceLocation(ambulanceId, latitude, longitude) {
  const { data } = await apiClient.post(`/tracking/ambulance/${ambulanceId}/location`, { latitude, longitude });
  return data;
}

export async function updateAmbulanceStatus(ambulanceId, status) {
  const { data } = await apiClient.patch(`/ambulances/${ambulanceId}/status`, { status });
  return data;
}
