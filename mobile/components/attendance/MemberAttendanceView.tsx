import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { attendanceService } from '../../services/attendanceService';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate, todayString } from '../../utils';
import { ATT_STATUS_MAP } from '../../constants';
import WebDatePicker from '../../components/ui/WebDatePicker';

export default function MemberAttendanceView() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(todayString());
  const [currentMonth, setCurrentMonth] = useState(todayString().slice(0, 7)); // YYYY-MM
  const [isLocating, setIsLocating] = useState(false);

  // Queries
  const { data: monthData, isLoading: monthLoading, isError: monthError, refetch: refetchMonth } = useQuery({
    queryKey: ['attendance-calendar', currentMonth],
    queryFn: () => attendanceService.getMyCalendar(currentMonth),
  });

  const { data: dayData, isLoading: dayLoading, refetch: refetchDay } = useQuery({
    queryKey: ['attendance-day', currentDate],
    queryFn: () => attendanceService.getMyDay(currentDate),
  });

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: attendanceService.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-day', currentDate] });
      queryClient.invalidateQueries({ queryKey: ['attendance-calendar', currentMonth] });
      if (Platform.OS === 'web') {
        window.alert('Checked in successfully!');
      } else {
        Alert.alert('Success', 'Checked in successfully!');
      }
    },
    onError: (err: any) => {
      if (Platform.OS === 'web') {
        window.alert(err?.response?.data?.message || 'Failed to check in.');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to check in.');
      }
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: attendanceService.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-day', currentDate] });
      queryClient.invalidateQueries({ queryKey: ['attendance-calendar', currentMonth] });
      if (Platform.OS === 'web') {
        window.alert('Checked out successfully!');
      } else {
        Alert.alert('Success', 'Checked out successfully!');
      }
    },
    onError: (err: any) => {
      if (Platform.OS === 'web') {
        window.alert(err?.response?.data?.message || 'Failed to check out.');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to check out.');
      }
    }
  });

  const getLocationData = async () => {
    try {
      if (Platform.OS === 'web') {
        return new Promise<any>((resolve, reject) => {
          if (!navigator.geolocation) {
            resolve({});
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
            (err) => resolve({}),
            { timeout: 10000, enableHighAccuracy: true }
          );
        });
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for attendance.');
        return {};
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch (error) {
      console.log('Location error', error);
      return {};
    }
  };

  const handleAction = async (type: 'checkIn' | 'checkOut') => {
    setIsLocating(true);
    const locData = await getLocationData();
    const payload = {
      date: currentDate,
      platform: Platform.OS,
      ...locData,
    };
    setIsLocating(false);

    if (type === 'checkIn') {
      checkInMutation.mutate(payload);
    } else {
      checkOutMutation.mutate(payload);
    }
  };

  const attendance = monthData?.attendance ?? [];
  const todayAtt = dayData?.attendance;

  const getA = (date: string) => attendance.find((a: any) => a.date.startsWith(date));

  // Calendar logic
  const daysInMonth = new Date(parseInt(currentMonth.slice(0, 4)), parseInt(currentMonth.slice(5, 7)), 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${currentMonth}-${d.toString().padStart(2, '0')}`;
  });

  const isToday = currentDate === todayString();

  return (
    <View style={styles.container}>
      {/* Top Section - Today's Action */}
      <Card style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <View>
            <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
            {todayAtt ? (
              <Badge 
                label={`Status: ${todayAtt.status.replace('_', ' ')}`} 
                bg="#e0e7ff" 
                text="#4338ca" 
              />
            ) : (
              <Badge label="Not Marked" bg="#f1f5f9" text="#64748b" />
            )}
          </View>

          {isToday && (
            <View style={styles.buttonsRow}>
              {!todayAtt?.check_in_at && (
                <TouchableOpacity 
                  style={[styles.btn, styles.btnIn, (isLocating || checkInMutation.isPending) && styles.btnDisabled]} 
                  onPress={() => handleAction('checkIn')}
                  disabled={isLocating || checkInMutation.isPending}
                >
                  <Text style={styles.btnTxt}>{(isLocating || checkInMutation.isPending) ? 'Processing...' : 'Check In'}</Text>
                </TouchableOpacity>
              )}
              {todayAtt?.check_in_at && !todayAtt?.check_out_at && (
                <TouchableOpacity 
                  style={[styles.btn, styles.btnOut, (isLocating || checkOutMutation.isPending) && styles.btnDisabled]} 
                  onPress={() => handleAction('checkOut')}
                  disabled={isLocating || checkOutMutation.isPending}
                >
                  <Text style={styles.btnTxt}>{(isLocating || checkOutMutation.isPending) ? 'Processing...' : 'Check Out'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {todayAtt && (
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Checked In</Text>
              <Text style={styles.timeValue}>{todayAtt.check_in ? todayAtt.check_in.slice(0, 5) : '--:--'}</Text>
            </View>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Checked Out</Text>
              <Text style={styles.timeValue}>{todayAtt.check_out ? todayAtt.check_out.slice(0, 5) : '--:--'}</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Calendar View */}
      <Text style={styles.sectionTitle}>Monthly Calendar</Text>
      <View style={styles.monthPicker}>
        <WebDatePicker 
          value={`${currentMonth}-01`} 
          onChange={(val: string) => setCurrentMonth(val.slice(0, 7))} 
        />
      </View>

      <Card style={styles.calendarCard}>
        {monthLoading ? (
          <LoadingState message="Loading calendar..." />
        ) : monthError ? (
          <ErrorState onRetry={refetchMonth} />
        ) : (
          <View style={styles.calendarGrid}>
            {calendarDays.map(date => {
              const att = getA(date);
              const isSelected = date === currentDate;
              const isFuture = date > todayString();
              
              let bg = '#fff';
              let border = '#e2e8f0';
              if (att) {
                if (att.status === 'present') bg = '#dcfce7';
                else if (att.status === 'absent') bg = '#fee2e2';
                else if (att.status === 'half_day') bg = '#fef08a';
                else if (att.status === 'on_leave') bg = '#dbeafe';
                else if (att.status === 'holiday') bg = '#f3e8ff';
              }
              
              return (
                <TouchableOpacity 
                  key={date} 
                  style={[
                    styles.dayCell, 
                    { backgroundColor: bg, borderColor: isSelected ? '#4f46e5' : border },
                    isSelected && styles.dayCellSelected
                  ]}
                  onPress={() => setCurrentDate(date)}
                  disabled={isFuture}
                >
                  <Text style={[styles.dayNum, isFuture && styles.dayFuture]}>{parseInt(date.slice(8, 10))}</Text>
                  {att && <Text style={styles.dayStatus} numberOfLines={1}>{att.status.replace('_', '')}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Card>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 20 },
  actionCard: { marginBottom: 24, padding: 20 },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  dateText: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  buttonsRow: { flexDirection: 'row', gap: 12 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center', minWidth: 120 },
  btnIn: { backgroundColor: '#16a34a' },
  btnOut: { backgroundColor: '#ea580c' },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  timeRow: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderColor: '#f1f5f9' },
  timeBlock: { flex: 1 },
  timeLabel: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  timeValue: { fontSize: 20, fontWeight: '700', color: '#334155' },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12 },
  monthPicker: { marginBottom: 12, alignSelf: 'flex-start' },
  calendarCard: { padding: 16 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCell: { 
    width: '13%', 
    minWidth: 40,
    aspectRatio: 1, 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayCellSelected: { borderWidth: 2, transform: [{ scale: 1.05 }] },
  dayNum: { fontSize: 14, fontWeight: '600', color: '#334155' },
  dayFuture: { color: '#cbd5e1' },
  dayStatus: { fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'uppercase', textAlign: 'center' },
});
