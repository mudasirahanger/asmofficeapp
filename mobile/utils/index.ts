// Utility functions for Office Hub

import { AVATAR_COLORS } from '../constants';

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

export const formatTime = (timeStr?: string): string => {
  if (!timeStr) return '—';
  const [hourStr, minStr] = timeStr.split(':');
  if (!hourStr || !minStr) return timeStr;
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12; // convert 0 to 12
  return `${hour.toString().padStart(2, '0')}:${minStr} ${ampm}`;
};

export const todayString = (): string => new Date().toISOString().split('T')[0];

export const initials = (name?: string): string => {
  if (!name) return '?';
  return name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
};

export const avatarColor = (id?: number): string => {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
};

export const isOverdue = (deadline?: string, status?: string): boolean => {
  if (!deadline) return false;
  if (status === 'completed' || status === 'billed') return false;
  const dateOnly = deadline.split('T')[0];
  return dateOnly < todayString();
};

export const daysLeft = (deadline?: string): number | null => {
  if (!deadline) return null;
  const dateOnly = deadline.split('T')[0];
  const d = new Date(dateOnly + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

export const daysLeftLabel = (deadline?: string, status?: string): string => {
  if (!deadline) return '';
  const dl = daysLeft(deadline);
  if (dl === null) return '';

  const overdue = isOverdue(deadline, status);
  if (overdue) return `${Math.abs(dl)}d overdue`;
  if (dl === 0) return 'Due today';
  if (dl === 1) return '1 day left';
  return `${dl}d left`;
};

export const capitalize = (s?: string): string => {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');
};

export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

export const leaveDays = (startDate: string, endDate: string): number => {
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  return Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
};

export const truncate = (str?: string, len: number = 50): string => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
};
