import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DrawerActions } from '@react-navigation/routers';
import { useNavigation } from 'expo-router';
import { leaveService } from '../../services/leaveService';
import { teamService } from '../../services/teamService';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { formatDate, leaveDays } from '../../utils';
import { LEAVE_STATUS_MAP } from '../../constants';
import WebDatePicker from '../../components/ui/WebDatePicker';

export default function LeavesScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ startDate: '', endDate: '', type: 'casual', reason: '' });

  const isFounder = user?.role === 'founder';
  const isHead = user?.role === 'head';
  const isHrAccountsReception = ['hr', 'accounts', 'reception'].includes(user?.role || '');
  const canApprove = isFounder || isHead || isHrAccountsReception;
  const canViewAll = isFounder || isHead || isHrAccountsReception;

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: teamService.getUsers,
    enabled: canViewAll,
  });

  const { data: leaves = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['leaves'],
    queryFn: leaveService.list,
  });

  const applyMutation = useMutation({
    mutationFn: (data: any) => leaveService.apply(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setF({ startDate: '', endDate: '', type: 'casual', reason: '' });
      setShowForm(false);
      if (Platform.OS === 'web') {
        window.alert('Leave application submitted successfully.');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Leave Submitted', { body: 'Your leave application was submitted successfully.' });
        }
      } else {
        Alert.alert('Success', 'Leave application submitted successfully.');
      }
    },
    onError: (err: any) => {
      if (Platform.OS === 'web') {
        window.alert(err?.message || 'Failed to apply for leave');
      } else {
        Alert.alert('Error', err?.message || 'Failed to apply for leave');
      }
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => leaveService.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => leaveService.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => leaveService.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const handleSubmit = () => {
    if (!f.startDate || !f.endDate || !f.reason.trim()) {
      Alert.alert('Missing Fields', 'Please select From date, To date, and provide a Reason.');
      return;
    }
    applyMutation.mutate({ start_date: f.startDate, end_date: f.endDate, type: f.type, reason: f.reason });
  };

  const users = usersData?.users ?? [];

  const toApprove = leaves.filter((l: any) => {
    if (l.status !== 'pending') return false;
    if (isFounder || isHrAccountsReception) return true;
    const u = users.find((x: any) => x.id === l.user_id);
    return u?.reporting_to === user?.id;
  });

  const teamLeaves = leaves.filter((l: any) => {
    if (l.user_id === user?.id) return false; // hide my own leaves from here
    // If it's a pending leave and I am the one to approve it, it's already in toApprove, so hide it from here
    if (l.status === 'pending') {
      if (isFounder || isHrAccountsReception) return false;
      const u = users.find((x: any) => x.id === l.user_id);
      if (u?.reporting_to === user?.id) return false;
    }
    return true;
  });

  const myLeaves = leaves.filter((l: any) => l.user_id === user?.id);

  if (isLoading) return <LoadingState message="Loading leaves..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaves</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addBtnTxt}>＋ Apply for Leave</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {showForm && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>New Leave Application</Text>
            <View style={styles.formGroupRow}>
              <View style={styles.flex1}>
                <Text style={styles.label}>From *</Text>
                <WebDatePicker value={f.startDate} onChange={(val: string) => setF(prev => ({ ...prev, startDate: val }))} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>To *</Text>
                <WebDatePicker value={f.endDate} onChange={(val: string) => setF(prev => ({ ...prev, endDate: val }))} />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Leave Type</Text>
              <View style={styles.chipRow}>
                {['casual', 'sick', 'annual', 'unpaid'].map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, f.type === t && styles.chipActive]} onPress={() => setF(prev => ({ ...prev, type: t }))}>
                    <Text style={[styles.chipTxt, f.type === t && styles.chipTxtActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason *</Text>
              <TextInput style={styles.inputMulti} multiline value={f.reason} onChangeText={t => setF(prev => ({ ...prev, reason: t }))} placeholder="Provide reason for leave..." />
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
                <Text style={styles.btnTxtWhite}>Submit Application</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.btnTxtDark}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {canApprove && toApprove.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Approvals ({toApprove.length})</Text>
            <View style={styles.list}>
              {toApprove.map((l: any) => {
                const u = users.find((x: any) => x.id === l.user_id) || l.user;
                const d = leaveDays(l.start_date, l.end_date);
                const st = (LEAVE_STATUS_MAP as any)[l.status] || { bg: '#f1f5f9', text: '#64748b' };
                return (
                  <Card key={l.id} style={styles.leaveCard}>
                    <View style={styles.leaveHeaderRow}>
                      <Avatar user={u} size="md" />
                      <View style={styles.leaveInfo}>
                        <View style={styles.leaveMeta}>
                          <Text style={styles.empName}>{u?.name}</Text>
                          <Badge label={l.status} bg={st?.bg} text={st?.text} />
                          <Badge label={`${l.type} leave`} bg="#f1f5f9" text="#64748b" />
                        </View>
                        <Text style={styles.leaveDates}>
                          {formatDate(l.start_date)} – {formatDate(l.end_date)} <Text style={styles.daysTxt}>({d} days)</Text>
                        </Text>
                        <Text style={styles.reasonTxt}>"{l.reason}"</Text>
                      </View>
                      <View style={styles.actionCol}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => approveMutation.mutate(l.id)}>
                          <Text style={styles.btnTxtWhite}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectMutation.mutate(l.id)}>
                          <Text style={styles.btnTxtWhite}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelActionBtn} onPress={() => cancelMutation.mutate(l.id)}>
                          <Text style={styles.btnTxtWhite}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {canViewAll && teamLeaves.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Leaves</Text>
            <View style={styles.list}>
              {teamLeaves.map((l: any) => {
                const u = users.find((x: any) => x.id === l.user_id) || l.user;
                const d = leaveDays(l.start_date, l.end_date);
                const st = (LEAVE_STATUS_MAP as any)[l.status] || { bg: '#f1f5f9', text: '#64748b' };
                const approver = l.approvedBy || users.find((x: any) => x.id === l.approved_by);
                return (
                  <Card key={l.id} style={styles.myLeaveCard}>
                    <View style={styles.myLeaveHeader}>
                      <View style={styles.myLeaveInfo}>
                        <View style={styles.leaveMeta}>
                          <Text style={styles.empName}>{u?.name}</Text>
                          <Badge label={l.status} bg={st?.bg} text={st?.text} />
                          <Badge label={`${l.type} leave`} bg="#f1f5f9" text="#64748b" />
                        </View>
                        <Text style={styles.leaveDates}>{formatDate(l.start_date)} – {formatDate(l.end_date)} · {d} days</Text>
                        <Text style={styles.reasonTxt}>"{l.reason}"</Text>
                        {approver && <Text style={styles.approverTxt}>{l.status} by {approver.name}</Text>}
                      </View>
                      <View style={styles.actionCol}>
                        <Text style={styles.appliedAt}>{formatDate(l.applied_at)}</Text>
                        {canApprove && (l.status === 'approved' || l.status === 'pending') && (
                          <TouchableOpacity style={[styles.cancelActionBtn, { marginTop: 8 }]} onPress={() => cancelMutation.mutate(l.id)}>
                            <Text style={styles.btnTxtWhite}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Leave History</Text>
          {myLeaves.length === 0 ? (
            <Card style={styles.cardEmpty}>
              <Text style={styles.emptyTxt}>No leave applications found</Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {myLeaves.map((l: any) => {
                const d = leaveDays(l.start_date, l.end_date);
                const st = (LEAVE_STATUS_MAP as any)[l.status] || { bg: '#f1f5f9', text: '#64748b' };
                const approver = l.approvedBy || users.find((x: any) => x.id === l.approved_by);
                return (
                  <Card key={l.id} style={styles.myLeaveCard}>
                    <View style={styles.myLeaveHeader}>
                      <View style={styles.myLeaveInfo}>
                        <View style={styles.leaveMeta}>
                          <Text style={styles.myLeaveType}>{l.type} Leave</Text>
                          <Badge label={l.status} bg={st?.bg} text={st?.text} />
                        </View>
                        <Text style={styles.leaveDates}>{formatDate(l.start_date)} – {formatDate(l.end_date)} · {d} days</Text>
                        <Text style={styles.reasonTxt}>"{l.reason}"</Text>
                        {approver && <Text style={styles.approverTxt}>{l.status} by {approver.name}</Text>}
                      </View>
                      <View style={styles.actionCol}>
                        <Text style={styles.appliedAt}>{formatDate(l.applied_at)}</Text>
                        {(l.status === 'approved' || l.status === 'pending') && (
                          <TouchableOpacity style={[styles.cancelActionBtn, { marginTop: 8 }]} onPress={() => cancelMutation.mutate(l.id)}>
                            <Text style={styles.btnTxtWhite}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  menuBtn: { marginRight: 16 },
  menuIcon: { fontSize: 24, color: '#475569' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', flex: 1 },
  addBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scroll: { padding: 24, maxWidth: 1200, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  
  formCard: { padding: 24, marginBottom: 24 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  formGroupRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  flex1: { flex: 1 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14 },
  inputMulti: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, minHeight: 80, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#4f46e5' },
  chipTxt: { fontSize: 14, color: '#475569', textTransform: 'capitalize' },
  chipTxtActive: { color: '#fff', fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  saveBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  cancelBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnTxtWhite: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  btnTxtDark: { color: '#475569', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12 },
  list: { gap: 12 },
  leaveCard: { padding: 16 },
  leaveHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  leaveInfo: { flex: 1 },
  leaveMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  empName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  leaveDates: { fontSize: 14, color: '#475569' },
  daysTxt: { color: '#94a3b8' },
  reasonTxt: { fontSize: 14, color: '#64748b', fontStyle: 'italic', marginTop: 6 },
  actionCol: { gap: 8 },
  approveBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  cancelActionBtn: { backgroundColor: '#64748b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  
  cardEmpty: { padding: 32, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: '#94a3b8' },
  
  myLeaveCard: { padding: 16 },
  myLeaveHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  myLeaveInfo: { flex: 1 },
  myLeaveType: { fontSize: 16, fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' },
  appliedAt: { fontSize: 12, color: '#94a3b8' },
  approverTxt: { fontSize: 12, color: '#94a3b8', marginTop: 6, textTransform: 'capitalize' },
});
