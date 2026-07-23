import api from './api';
import { ClientSummary } from '../types';

export const clientService = {
  async list(): Promise<{ clients: ClientSummary[] }> {
    const res = await api.get('/clients');
    return res.data;
  },
};
