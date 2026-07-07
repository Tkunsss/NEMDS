// src/api/client.js
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ncemds_driver_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ncemds_driver_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;
