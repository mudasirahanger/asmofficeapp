import api from './api';
import { Client, ClientSummary } from '../types';

export const clientService = {
  async list(): Promise<{ clients: ClientSummary[] }> {
    const res = await api.get('/clients');
    return res.data;
  },

  async create(name: string): Promise<{ client: Client }> {
    const res = await api.post('/clients', { name });
    return res.data;
  },

  async rename(id: number, name: string): Promise<{ client: Client }> {
    const res = await api.put(`/clients/${id}`, { name });
    return res.data;
  },

  // Backend returns 409 if the client is still linked to any project —
  // callers should read err.response?.status === 409 to show that
  // specific message rather than a generic failure toast.
  async remove(id: number): Promise<{ message: string }> {
    const res = await api.delete(`/clients/${id}`);
    return res.data;
  },
};
