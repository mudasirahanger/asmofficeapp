import api from './api';

export const billingService = {
  async getBilling() {
    const res = await api.get('/billing');
    return res.data;
  },

  async getDashboard() {
    const res = await api.get('/dashboard');
    return res.data;
  },

  async getTeam() {
    const res = await api.get('/team');
    return res.data;
  },

  async getDepartments() {
    const res = await api.get('/departments');
    return res.data;
  },

  async getUsers() {
    const res = await api.get('/users');
    return res.data;
  },
};
