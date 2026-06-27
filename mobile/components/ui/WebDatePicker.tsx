import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function WebDatePicker({ value, onChange, style }: any) {
  const [show, setShow] = useState(false);

  let dateVal = new Date();
  if (value && typeof value === 'string') {
    dateVal = new Date(value);
  }

  const handleNativeChange = (event: any, selectedDate?: Date) => {
    setShow(false);
    if (selectedDate) {
      const yy = selectedDate.getFullYear();
      const mm = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const dd = selectedDate.getDate().toString().padStart(2, '0');
      onChange(`${yy}-${mm}-${dd}`);
    }
  };

  return (
    <View>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            color: value ? '#1e293b' : '#94a3b8',
            outline: 'none',
            fontFamily: 'inherit',
          } as any}
        />
      ) : (
        <>
          <TouchableOpacity 
            style={[styles.input, style]} 
            onPress={() => setShow(true)}
          >
            <Text style={{ color: value ? '#1e293b' : '#94a3b8' }}>
              {value || 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>

          {show && (
            <DateTimePicker
              value={dateVal}
              mode="date"
              display="default"
              onChange={handleNativeChange}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  }
});
