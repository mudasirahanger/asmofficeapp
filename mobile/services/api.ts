import axios from 'axios';
import { secureStorage } from '../lib/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

// Request interceptor — attach token
api.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await secureStorage.deleteItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;
