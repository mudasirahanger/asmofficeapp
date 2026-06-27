import api from './api';

export const settingsService = {
  getSettings: async () => {
    const { data } = await api.get('/settings');
    return data;
  },

  updateSettings: async (settings: Record<string, string>) => {
    const { data } = await api.post('/settings', { settings });
    return data;
  },
};
