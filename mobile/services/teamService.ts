import api from './api';
import { User } from '../types';

export const teamService = {
  async getDepartments() {
    const res = await api.get('/departments');
    return { departments: res.data };
  },

  async createDepartment(data: any) {
    const res = await api.post('/departments', data);
    return res.data;
  },

  async updateDepartment(id: number, data: any) {
    const res = await api.put(`/departments/${id}`, data);
    return res.data;
  },

  async deleteDepartment(id: number) {
    const res = await api.delete(`/departments/${id}`);
    return res.data;
  },

  async getUsers() {
    const res = await api.get('/users');
    return { users: res.data };
  },

  async createUser(data: any) {
    const res = await api.post('/users', data);
    return res.data;
  },

  async updateUser(id: number, data: any) {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },

  async deleteUser(id: number) {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};
