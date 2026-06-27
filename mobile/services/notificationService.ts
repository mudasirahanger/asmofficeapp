import api from './api';
import { AppNotification } from '../types';

export const notificationService = {
  async list(): Promise<{ unread_count: number; notifications: AppNotification[] }> {
    const res = await api.get('/notifications');
    return res.data;
  },

  // Alias for compatibility
  async getNotifications(): Promise<{ unread_count: number; notifications: AppNotification[] }> {
    const res = await api.get('/notifications');
    return res.data;
  },

  async markRead(id: number) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  // Alias for compatibility
  async markAsRead(id: number) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllRead() {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },
};
