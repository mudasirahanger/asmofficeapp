// App-wide constants

export const AVATAR_COLORS = [
  '#6366f1', // indigo-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#14b8a6', // teal-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

export const DEPT_COLORS: Record<string, {
  bg: string; text: string; border: string; badge: string; badgeText: string; dot: string;
}> = {
  blue: {
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
    badge: '#dbeafe',
    badgeText: '#1d4ed8',
    dot: '#3b82f6',
  },
  emerald: {
    bg: '#ecfdf5',
    text: '#065f46',
    border: '#a7f3d0',
    badge: '#d1fae5',
    badgeText: '#065f46',
    dot: '#10b981',
  },
  violet: {
    bg: '#f5f3ff',
    text: '#5b21b6',
    border: '#ddd6fe',
    badge: '#ede9fe',
    badgeText: '#5b21b6',
    dot: '#8b5cf6',
  },
  pink: {
    bg: '#fdf2f8',
    text: '#9d174d',
    border: '#fbcfe8',
    badge: '#fce7f3',
    badgeText: '#9d174d',
    dot: '#ec4899',
  },
  amber: {
    bg: '#fffbeb',
    text: '#92400e',
    border: '#fde68a',
    badge: '#fef3c7',
    badgeText: '#92400e',
    dot: '#f59e0b',
  },
  slate: {
    bg: '#f8fafc',
    text: '#334155',
    border: '#cbd5e1',
    badge: '#f1f5f9',
    badgeText: '#475569',
    dot: '#64748b',
  },
};

export const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  assigned:    { label: 'Assigned',    bg: '#dbeafe', text: '#1d4ed8' },
  in_progress: { label: 'In Progress', bg: '#fef3c7', text: '#92400e' },
  completed:   { label: 'Completed',   bg: '#d1fae5', text: '#065f46' },
  billed:      { label: 'Billed',      bg: '#ede9fe', text: '#5b21b6' },
};

export const PRIORITY_MAP: Record<string, { label: string; bg: string; text: string }> = {
  low:    { label: 'Low',    bg: '#f3f4f6', text: '#6b7280' },
  medium: { label: 'Medium', bg: '#fef9c3', text: '#713f12' },
  high:   { label: 'High',   bg: '#fee2e2', text: '#b91c1c' },
};

export const LEAVE_STATUS_MAP: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#b91c1c' },
  cancelled:{ bg: '#f3f4f6', text: '#6b7280' },
};

export const ATT_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  present:  { label: 'Present',   bg: '#d1fae5', text: '#065f46' },
  absent:   { label: 'Absent',    bg: '#fee2e2', text: '#b91c1c' },
  half_day: { label: 'Half Day',  bg: '#fef3c7', text: '#92400e' },
  on_leave: { label: 'On Leave',  bg: '#dbeafe', text: '#1d4ed8' },
  holiday:  { label: 'Holiday',   bg: '#ede9fe', text: '#5b21b6' },
};

export const COLORS = {
  // Brand
  primary:    '#6366f1',
  primaryDark:'#4f46e5',
  background: '#f1f5f9',
  surface:    '#ffffff',
  sidebar:    '#0f172a',
  sidebarItem:'#1e293b',

  // Text
  textPrimary:   '#1e293b',
  textSecondary: '#64748b',
  textMuted:     '#94a3b8',
  textInverse:   '#ffffff',

  // Status
  success:  '#10b981',
  warning:  '#f59e0b',
  danger:   '#ef4444',
  info:     '#3b82f6',

  // Borders
  border:       '#e2e8f0',
  borderLight:  '#f1f5f9',
  borderDark:   '#cbd5e1',

  // Overdue
  overdueBg:   '#fef2f2',
  overdueBorder:'#fecaca',
  overdueText: '#dc2626',
};

export const DEPARTMENTS_SEED = [
  { id: 1, slug: 'video',           name: 'Video Production',           color: 'blue'    },
  { id: 2, slug: 'web',             name: 'Web & Digital',              color: 'emerald' },
  { id: 3, slug: 'kashmir_impulse', name: 'Kashmir Impulse',            color: 'violet'  },
  { id: 4, slug: 'social',          name: 'Social Media',               color: 'pink'    },
  { id: 5, slug: 'ecommerce',       name: 'E-Commerce (Kashmir Brand)', color: 'amber'   },
  { id: 6, slug: 'operations',      name: 'Operations & Admin',         color: 'slate'   },
];
