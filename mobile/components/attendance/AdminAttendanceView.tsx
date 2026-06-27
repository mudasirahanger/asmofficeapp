import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { teamService } from '../../services/teamService';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { formatDate, todayString } from '../../utils';
import { ATT_STATUS_MAP } from '../../constants';
import WebTimePicker from '../../components/ui/WebTimePicker';

export default function AdminAttendanceView() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const showLocation = ['founder', 'hr', 'head'].includes(user?.role || '');
  const [selDate, setSelDate] = useState(todayString());
  const [editU, setEditU] = useState<any>(null);
  const [form, setForm] = useState({ status: 'present', checkIn: '09:00', checkOut: '17:00' });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: teamService.getUsers,
  });

  const { data: attData, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance', selDate],
    queryFn: () => attendanceService.getForDate(selDate),
  });

  const markMutation = useMutation({
    mutationFn: (data: any) => attendanceService.mark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', selDate] });
      setEditU(null);
      if (Platform.OS === 'web') {
        window.alert('Attendance saved successfully!');
      } else {
        Alert.alert('Success', 'Attendance saved successfully!');
      }
    },
    onError: (err: any) => {
      if (Platform.OS === 'web') {
        window.alert(err?.response?.data?.message || 'Failed to save attendance.');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to save attendance.');
      }
    }
  });

  const usersList = usersData?.users?.filter((u: any) => u.role !== 'founder') ?? [];
  const attendanceRecords = attData?.attendance ?? [];

  const getA = (uid: number, date: string) => attendanceRecords.find((a: any) => a.user_id === uid);

  const openEdit = (u: any) => {
    const existing = getA(u.id, selDate);
    setForm({
      status: existing?.status || 'present',
      checkIn: existing?.check_in ? existing.check_in.slice(0, 5) : '09:00',
      checkOut: existing?.check_out ? existing.check_out.slice(0, 5) : '17:00'
    });
    setEditU(u);
  };

  const handleSave = () => {
    markMutation.mutate({
      user_id: editU.id,
      date: selDate,
      status: form.status,
      check_in: ['present', 'half_day'].includes(form.status) ? form.checkIn : null,
      check_out: ['present', 'half_day'].includes(form.status) ? form.checkOut : null,
    });
  };

  const presentCount = attendanceRecords.filter((a: any) => a.status === 'present').length;
  const absentCount = attendanceRecords.filter((a: any) => a.status === 'absent').length;
  const leaveCount = attendanceRecords.filter((a: any) => a.status === 'on_leave').length;

  if (isLoading) return <LoadingState message="Loading attendance..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <>
      <View style={styles.controlsRow}>
        <TextInput style={styles.dateInput} value={selDate} onChangeText={setSelDate} placeholder="YYYY-MM-DD" />
        <View style={styles.badgesRow}>
          <Badge label={`✓ Present: ${presentCount}`} bg="#dcfce7" text="#166534" />
          <Badge label={`✗ Absent: ${absentCount}`} bg="#fee2e2" text="#991b1b" />
          <Badge label={`🌿 Leave: ${leaveCount}`} bg="#dbeafe" text="#1e40af" />
        </View>
      </View>

      <Card style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 200 }]}>Employee</Text>
              <Text style={[styles.th, { width: 150 }]}>Department</Text>
              <Text style={[styles.th, { width: 120 }]}>Status</Text>
              <Text style={[styles.th, { width: 100 }]}>Check In</Text>
              <Text style={[styles.th, { width: 100 }]}>Check Out</Text>
              {showLocation && <Text style={[styles.th, { width: 120 }]}>Location</Text>}
              <Text style={[styles.th, { width: 80 }]}></Text>
            </View>
            {usersList.map((u: any) => {
              const a = getA(u.id, selDate);
              const st = a ? (ATT_STATUS_MAP as any)[a.status] || { bg: '#f1f5f9', text: '#64748b', label: a.status } : null;
              return (
                <View key={u.id} style={styles.tr}>
                  <View style={[styles.td, { width: 200, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <Avatar user={u} size="sm" />
                    <Text style={styles.empName}>{u.name}</Text>
                  </View>
                  <Text style={[styles.td, styles.tdDim, { width: 150 }]}>
                    {u.departments?.map((d: any) => d.name).join(', ') || '—'}
                  </Text>
                  <View style={[styles.td, { width: 120, justifyContent: 'center' }]}>
                    {a ? (
                      <Badge label={st.label} bg={st.bg} text={st.text} />
                    ) : (
                      <Text style={styles.notMarked}>Not marked</Text>
                    )}
                  </View>
                  <Text style={[styles.td, styles.tdDim, { width: 100 }]}>{a?.check_in ? a.check_in.slice(0, 5) : '—'}</Text>
                  <Text style={[styles.td, styles.tdDim, { width: 100 }]}>{a?.check_out ? a.check_out.slice(0, 5) : '—'}</Text>
                  {showLocation && (
                    <View style={[styles.td, { width: 120, justifyContent: 'center' }]}>
                      {a?.check_in_latitude && a?.check_in_longitude ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${a.check_in_latitude},${a.check_in_longitude}`)}>
                          <Text style={styles.locationLink}>View Map</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.notMarked}>No location</Text>
                      )}
                    </View>
                  )}
                  <TouchableOpacity style={[styles.td, { width: 80, justifyContent: 'center' }]} onPress={() => openEdit(u)}>
                    <Text style={styles.actionTxt}>Mark</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={!!editU} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Attendance — {editU?.name}</Text>
            <Text style={styles.modalSub}>{formatDate(selDate)}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {['present', 'absent', 'half_day', 'on_leave', 'holiday'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusChip, form.status === s && styles.statusChipActive]}
                    onPress={() => setForm(f => ({ ...f, status: s }))}
                  >
                    <Text style={[styles.statusChipTxt, form.status === s && styles.statusChipTxtActive]}>
                      {s.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {['present', 'half_day'].includes(form.status) && (
              <View style={styles.timeRow}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Check In</Text>
                  <WebTimePicker value={form.checkIn} onChange={(val: string) => setForm(f => ({ ...f, checkIn: val }))} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Check Out</Text>
                  <WebTimePicker value={form.checkOut} onChange={(val: string) => setForm(f => ({ ...f, checkOut: val }))} />
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.btnTxtWhite}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditU(null)}>
                <Text style={styles.btnTxtDark}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 20 },
  dateInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, minWidth: 140 },
  badgesRow: { flexDirection: 'row', gap: 12 },
  card: { padding: 0, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 12 },
  th: { paddingHorizontal: 16, fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f8fafc', paddingVertical: 12 },
  td: { paddingHorizontal: 16 },
  tdDim: { fontSize: 13, color: '#64748b' },
  empName: { fontSize: 14, fontWeight: '500', color: '#334155' },
  notMarked: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' },
  locationLink: { fontSize: 12, color: '#0ea5e9', textDecorationLine: 'underline', fontWeight: '500' },
  actionTxt: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  modalSub: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  statusChipActive: { backgroundColor: '#4f46e5' },
  statusChipTxt: { fontSize: 13, color: '#475569', textTransform: 'capitalize' },
  statusChipTxtActive: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  flex1: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12 },
  saveBtn: { flex: 1, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnTxtWhite: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnTxtDark: { color: '#475569', fontWeight: '600', fontSize: 14 },
});
