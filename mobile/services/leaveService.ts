import api from './api';
import { LeaveRequest, ApplyLeaveForm } from '../types';

export const leaveService = {
  async list(): Promise<LeaveRequest[]> {
    const res = await api.get('/leaves');
    return res.data;
  },

  async apply(data: ApplyLeaveForm): Promise<LeaveRequest> {
    const res = await api.post('/leaves', data);
    return res.data;
  },

  async approve(id: number): Promise<LeaveRequest> {
    const res = await api.patch(`/leaves/${id}/approve`);
    return res.data;
  },

  async reject(id: number): Promise<LeaveRequest> {
    const res = await api.patch(`/leaves/${id}/reject`);
    return res.data;
  },

  async cancel(id: number): Promise<LeaveRequest> {
    const res = await api.patch(`/leaves/${id}/cancel`);
    return res.data;
  },
};
