import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function WebTimePicker({ value, onChange, style }: any) {
  const [show, setShow] = useState(false);

  // Convert HH:MM string to Date object
  let dateVal = new Date();
  if (value && typeof value === 'string' && value.includes(':')) {
    const [h, m] = value.split(':');
    dateVal.setHours(parseInt(h, 10));
    dateVal.setMinutes(parseInt(m, 10));
  }

  const handleNativeChange = (event: any, selectedDate?: Date) => {
    setShow(false);
    if (selectedDate) {
      const hh = selectedDate.getHours().toString().padStart(2, '0');
      const mm = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${hh}:${mm}`);
    }
  };

  return (
    <View>
      <TouchableOpacity 
        style={[styles.input, style]} 
        onPress={() => setShow(true)}
      >
        <Text style={{ color: value ? '#1e293b' : '#94a3b8' }}>
          {value || 'HH:MM'}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={dateVal}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleNativeChange}
        />
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
