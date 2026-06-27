import api from './api';
import { secureStorage } from '../lib/secureStorage';
import { User, LoginCredentials } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ token: string; user: User }> {
    const res = await api.post('/login', credentials);
    const { token, user } = res.data;
    await secureStorage.setItem('auth_token', token);
    await secureStorage.setItem('auth_user', JSON.stringify(user));
    return { token, user };
  },

  async me(): Promise<User> {
    const res = await api.get('/me');
    await secureStorage.setItem('auth_user', JSON.stringify(res.data.user));
    return res.data.user;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } catch {
      // ignore
    } finally {
      await secureStorage.deleteItem('auth_token');
      await secureStorage.deleteItem('auth_user');
    }
  },

  async getToken(): Promise<string | null> {
    return await secureStorage.getItem('auth_token');
  },

  async getCachedUser(): Promise<User | null> {
    const userStr = await secureStorage.getItem('auth_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  async registerDeviceToken(deviceId: string, expoPushToken: string, platform: string): Promise<void> {
    await api.post('/device-token', { device_id: deviceId, expo_push_token: expoPushToken, platform });
  },
};
