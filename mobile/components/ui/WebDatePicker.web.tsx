import React from 'react';

export default function WebDatePicker({ value, onChange, style }: any) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '10px 14px',
        fontSize: '14px',
        color: '#1e293b',
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        transition: 'border-color 0.2s',
        ...style
      }}
      onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
      onBlur={(e) => (e.target.style.borderColor = style?.borderColor || '#e2e8f0')}
    />
  );
}
