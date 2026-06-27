import api from './api';
import { Attendance, AttendanceForm } from '../types';

export const attendanceService = {
  async getForDate(date: string) {
    const res = await api.get('/attendance', { params: { date } });
    return res.data;
  },

  async mark(data: AttendanceForm): Promise<Attendance> {
    const res = await api.post('/attendance', data);
    return res.data;
  },

  async myHistory(): Promise<{ history: Attendance[] }> {
    const res = await api.get('/attendance/my-history');
    return res.data;
  },

  async getMyCalendar(month: string) {
    const res = await api.get('/attendance/my-calendar', { params: { month } });
    return res.data;
  },

  async getMyDay(date: string) {
    const res = await api.get('/attendance/my-day', { params: { date } });
    return res.data;
  },

  async checkIn(data: any) {
    const res = await api.post('/attendance/check-in', data);
    return res.data;
  },

  async checkOut(data: any) {
    const res = await api.post('/attendance/check-out', data);
    return res.data;
  },
};
