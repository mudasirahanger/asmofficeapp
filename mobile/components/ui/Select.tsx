import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface SelectProps {
  label?: string;
  value: string | number;
  onValueChange: (val: any) => void;
  items: { label: string; value: string | number }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, value, onValueChange, items, placeholder }) => (
  <View>
    {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
    <View style={styles.wrapper}>
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        style={styles.picker}
        itemStyle={styles.pickerItem}
      >
        {placeholder && <Picker.Item label={placeholder} value="" color="#94a3b8" />}
        {items.map((item) => (
          <Picker.Item key={item.value} label={item.label} value={item.value} />
        ))}
      </Picker>
    </View>
  </View>
);

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  wrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: '#1e293b',
  },
  pickerItem: {
    fontSize: 14,
  },
});
