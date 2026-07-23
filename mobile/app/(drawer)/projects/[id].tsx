import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../../services/projectService';
import { teamService } from '../../../services/teamService';
import { useAuthStore } from '../../../store/authStore';
import { LoadingState, ErrorState } from '../../../components/shared/States';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { STATUS_MAP, PRIORITY_MAP, DEPT_COLORS } from '../../../constants';
import { formatDate, formatDateTime, isOverdue, daysLeftLabel } from '../../../utils';
import DateTimePicker from '@react-native-community/datetimepicker';
import WebDatePicker from '../../../components/ui/WebDatePicker';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [showProg, setShowProg] = useState(false);
  const [progTxt, setProgTxt] = useState('');
  const [progPct, setProgPct] = useState('');

  const [showSub, setShowSub] = useState(false);
  const [subTo, setSubTo] = useState('');

  const [showDl, setShowDl] = useState(false);
  const [newDl, setNewDl] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const projectId = parseInt(id as string, 10);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId),
    enabled: !!projectId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: teamService.getUsers,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => projectService.update(projectId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); },
  });

  const completeMutation = useMutation({
    mutationFn: () => projectService.complete(projectId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); },
  });

  const markBilledMutation = useMutation({
    mutationFn: () => projectService.markBilled(projectId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); },
  });

  const subAssignMutation = useMutation({
    mutationFn: (uid: number) => projectService.subAssign(projectId, uid),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }); 
      setShowSub(false); 
      if (Platform.OS === 'web') window.alert("Successfully sub-assigned.");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err.message;
      if (Platform.OS === 'web') window.alert(`Error assigning: ${msg}`);
      else console.error("Error sub-assigning:", msg);
    }
  });

  const deadlineMutation = useMutation({
    mutationFn: (dl: string) => projectService.changeDeadline(projectId, dl),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); setShowDl(false); },
  });

  const addProgMutation = useMutation({
    mutationFn: (data: any) => projectService.addProgress(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowProg(false);
      setProgTxt('');
      setProgPct('');
    },
  });

  if (isLoading) return <LoadingState message="Loading project..." />;
  if (isError || !data?.project) return <ErrorState onRetry={refetch} />;

  const p = data.project;
  const progress = data.progress ?? [];
  const users = usersData?.users ?? [];
  
  const status = STATUS_MAP[p.status];
  const priority = PRIORITY_MAP[p.priority];
  // Falls back to slate both when there's no department color AND when the
  // stored color isn't one of the palette keys DEPT_COLORS defines — the
  // previous version only handled the first case, so an unrecognized color
  // value (e.g. old data, a manual DB edit) crashed this screen with
  // "Cannot read properties of undefined (reading 'badge')" instead of
  // just rendering a neutral badge. ProjectCard.tsx already had this same
  // `?? DEPT_COLORS.slate` guard; this screen didn't. Found via the e2e
  // suite in mobile/e2e/mocked-production-build.spec.ts.
  const deptColor = p.department?.color ? (DEPT_COLORS[p.department.color] ?? DEPT_COLORS.slate) : DEPT_COLORS.slate;
  
  const overdue = isOverdue(p.deadline, p.status);
  const dlLabel = daysLeftLabel(p.deadline, p.status);
  
  const latestPct = progress.length > 0 ? progress[0].percentage : 0;
  
  const extractUser = (val: any, relation: any) => relation || ((typeof val === 'object' && val !== null) ? val : users.find((u: any) => u.id === val));
  
  const creator = extractUser(p.created_by, p.createdBy) || { name: 'System', id: 0 };
  const assignee = extractUser(p.assigned_to, p.assignedTo);
  const subAssignee = extractUser(p.sub_assigned_to, p.subAssignedTo);
  
  const isFounder = user?.role === 'founder';
  const isHead = user?.role === 'head';
  const isAccounts = user?.role === 'accounts';
  const inDept = isHead && user?.departments?.some((d: any) => Number(d.id) === Number(p.department_id));
  const canEdit = isFounder || inDept;
  const canProgress = isFounder || Number(p.assigned_to) === Number(user?.id) || Number(p.sub_assigned_to) === Number(user?.id) || user?.departments?.some((d: any) => Number(d.id) === Number(p.department_id));
  const deptMembers = users.filter((u: any) => u.departments?.some((d: any) => Number(d.id) === Number(p.department_id)) && Number(u.id) !== Number(user?.id) && Number(u.id) !== Number(p.assigned_to));
  const finished = ['completed', 'billed'].includes(p.status);
  const canBill = (isFounder || isAccounts) && p.status === 'completed';

  const availableUsers = isFounder
    ? users.filter((u: any) => Number(u.id) !== Number(user?.id) && Number(u.id) !== Number(p.assigned_to))
    : deptMembers;

  const handleProgSubmit = () => {
    if (!progTxt.trim()) return;
    addProgMutation.mutate({ text: progTxt, percentage: parseInt(progPct, 10) || latestPct });
  };

  const handleComplete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Mark this project as COMPLETED?')) completeMutation.mutate();
    } else {
      completeMutation.mutate();
    }
  };

  const handleMarkBilled = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Mark this project as BILLED?')) markBilledMutation.mutate();
    } else {
      markBilledMutation.mutate();
    }
  };

  const handleSubAssign = () => {
    if (!subTo) return;
    subAssignMutation.mutate(parseInt(subTo, 10));
  };

  const handleDlSubmit = () => {
    if (!newDl) return;
    deadlineMutation.mutate(newDl);
  };

  const renderMainContent = () => (
    <View style={styles.mainCol}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{p.title}</Text>
              {assignee ? (
                <Badge label={`👨‍💻 ${assignee.name}`} bg="#f1f5f9" text="#475569" />
              ) : (
                <Badge label="👨‍💻 Unassigned" bg="#fef2f2" text="#dc2626" />
              )}
              {subAssignee && (
                <Badge label={`👨‍💻 Sub: ${subAssignee.name}`} bg="#f1f5f9" text="#475569" />
              )}
              <Badge label={status?.label ?? p.status} bg={status?.bg} text={status?.text} />
              <Badge label={priority?.label ?? p.priority} bg={priority?.bg} text={priority?.text} />
            </View>
            {p.client && <Text style={styles.clientTxt}>Client Name: <Text style={styles.clientName}>{p.client}</Text></Text>}
            {p.deadline && !finished && (
              <Text style={[styles.dlTxt, overdue && styles.overdueTxt]}>
                {overdue ? '⚠ ' : ''}{dlLabel} — Due Date: {formatDate(p.deadline)}
              </Text>
            )}
          </View>
          {canEdit && !finished && (
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => router.push(`/(drawer)/projects/edit/${projectId}` as any)}
            >
              <Text style={styles.editTxt}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {p.description && <Text style={styles.desc}>{p.description}</Text>}
        <ProgressBar value={latestPct} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress Updates</Text>
          {canProgress && !finished && (
            <TouchableOpacity onPress={() => setShowProg(!showProg)}>
              <Text style={styles.addBtn}>＋ Add Update</Text>
            </TouchableOpacity>
          )}
        </View>

        {showProg && (
          <View style={styles.progForm}>
            <Text style={styles.label}>What was done?</Text>
            <TextInput style={styles.inputMulti} multiline value={progTxt} onChangeText={setProgTxt} placeholder="Describe today's work..." />
            <View style={styles.formRow}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Overall % (current: {latestPct}%)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={progPct} onChangeText={setProgPct} placeholder={`${latestPct}`} />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleProgSubmit}>
                <Text style={styles.btnTextWhite}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProg(false)}>
                <Text style={styles.btnTextDark}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {progress.length === 0 ? (
          <Text style={styles.emptyTxt}>No updates yet. Be the first to log progress!</Text>
        ) : (
          <View style={styles.progList}>
            {progress.map((pr: any) => (
              <View key={pr.id} style={styles.progItem}>
                <Avatar user={pr.user} size="sm" />
                <View style={styles.progContent}>
                  <View style={styles.progHeader}>
                    <Text style={styles.progName}>{pr.user?.name}</Text>
                    <View style={styles.progMeta}>
                      <Badge label={`${pr.percentage}%`} bg="#e0e7ff" text="#4f46e5" />
                      <Text style={styles.progTime}>{formatDateTime(pr.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={styles.progDesc}>{pr.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {(canProgress && !finished || canBill) && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionGrid}>
            {canProgress && !finished && (
              <>
                <TouchableOpacity style={styles.successBtn} onPress={handleComplete}>
                  <Text style={styles.btnTextWhite}>✅ Mark Complete</Text>
                </TouchableOpacity>
                {((isHead && inDept) || isFounder) && availableUsers.length > 0 && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowSub(!showSub)}>
                    <Text style={styles.btnTextDark}>👤 Sub-assign to Member</Text>
                  </TouchableOpacity>
                )}
                {isFounder && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setNewDl(p.deadline || ''); setShowDl(!showDl); }}>
                    <Text style={styles.btnTextDark}>📅 Change Deadline</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {canBill && (
              <TouchableOpacity style={styles.purpleBtn} onPress={handleMarkBilled}>
                <Text style={styles.btnTextWhite}>💵 Mark as Billed</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {showSub && (
            <View style={styles.mt4}>
               {/* Simplified Select for React Native without external library */}
               <Text style={styles.label}>Sub-assign to</Text>
               <View style={styles.userList}>
                 {availableUsers.map((m: any) => (
                   <TouchableOpacity key={m.id} style={[styles.userChip, subTo === m.id.toString() && styles.activeChip]} onPress={() => setSubTo(m.id.toString())}>
                     <Text style={subTo === m.id.toString() ? styles.activeChipTxt : styles.chipTxt}>{m.name}</Text>
                   </TouchableOpacity>
                 ))}
               </View>
               <View style={styles.formRow}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSubAssign}>
                    <Text style={styles.btnTextWhite}>Assign</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSub(false)}>
                    <Text style={styles.btnTextDark}>Cancel</Text>
                  </TouchableOpacity>
               </View>
            </View>
          )}

          {showDl && (
            <View style={styles.mt4}>
              <Text style={styles.label}>New Deadline</Text>
              
              {Platform.OS === 'web' ? (
                <WebDatePicker 
                  value={newDl} 
                  onChange={(val: string) => setNewDl(val)} 
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '12px',
                    border: '1px solid #e2e8f0', backgroundColor: '#ffffff',
                    fontSize: '14px', color: '#1e293b', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              ) : Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={newDl ? new Date(newDl) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      const localISOTime = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                      setNewDl(localISOTime);
                    }
                  }}
                  style={{ alignSelf: 'flex-start' }}
                />
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, { justifyContent: 'center' }]}>
                    <Text style={{ color: newDl ? '#1e293b' : '#94a3b8' }}>{newDl || 'Select Deadline'}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={newDl ? new Date(newDl) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (event.type === 'set' && selectedDate) {
                          const localISOTime = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                          setNewDl(localISOTime);
                        }
                      }}
                    />
                  )}
                </>
              )}
              
              <View style={[styles.formRow, { marginTop: 12 }]}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleDlSubmit}>
                    <Text style={styles.btnTextWhite}>Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDl(false)}>
                    <Text style={styles.btnTextDark}>Cancel</Text>
                  </TouchableOpacity>
               </View>
            </View>
          )}
        </Card>
      )}
    </View>
  );

  const renderSidebar = () => (
    <View style={styles.sideCol}>
      <Card style={styles.card}>
        <Text style={styles.sideTitle}>PROJECT DETAILS</Text>
        <View style={styles.dlList}>
          {p.department && (
            <View style={styles.dlItem}>
              <Text style={styles.dt}>Department</Text>
              <View style={[styles.dtBadge, { backgroundColor: deptColor.badge }]}>
                <Text style={[styles.dtBadgeTxt, { color: deptColor.text }]}>{p.department.name}</Text>
              </View>
            </View>
          )}
          <View style={styles.dlItem}>
            <Text style={styles.dt}>Deadline</Text>
            <Text style={[styles.dd, overdue && styles.overdueTxt]}>{formatDate(p.deadline)}{overdue ? ' ⚠' : ''}</Text>
          </View>
          <View style={styles.dlItem}>
            <Text style={styles.dt}>Created by</Text>
            <View style={styles.ddRow}>
              <Avatar user={creator} size="sm" />
              <Text style={styles.ddName}>{creator.name}</Text>
            </View>
          </View>
          {assignee && (
            <View style={styles.dlItem}>
              <Text style={styles.dt}>Assigned to</Text>
              <View style={styles.ddRow}>
                <Avatar user={assignee} size="sm" />
                <Text style={styles.ddName}>{assignee.name}</Text>
              </View>
            </View>
          )}
          {subAssignee && (
            <View style={styles.dlItem}>
              <Text style={styles.dt}>Working on it</Text>
              <View style={styles.ddRow}>
                <Avatar user={subAssignee} size="sm" />
                <Text style={styles.ddName}>{subAssignee.name}</Text>
              </View>
            </View>
          )}
          {p.notes && (
            <View style={styles.dlItem}>
              <Text style={styles.dt}>Notes</Text>
              <Text style={styles.ddDesc}>{p.notes}</Text>
            </View>
          )}
          <View style={styles.dlItem}><Text style={styles.dt}>Created</Text><Text style={styles.ddLight}>{formatDate(p.created_at)}</Text></View>
          {p.completed_at && <View style={styles.dlItem}><Text style={styles.dt}>Completed</Text><Text style={styles.ddGreen}>{formatDate(p.completed_at)}</Text></View>}
          {p.billed_at && <View style={styles.dlItem}><Text style={styles.dt}>Billed</Text><Text style={styles.ddPurple}>{formatDate(p.billed_at)}</Text></View>}
        </View>
      </Card>

      {progress.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sideTitle}>PROGRESS TIMELINE</Text>
          <View style={styles.timeline}>
            <View style={styles.tlLine} />
            {[...progress].reverse().map((pr: any) => (
              <View key={pr.id} style={styles.tlItem}>
                <View style={styles.tlDotContainer}>
                  <View style={styles.tlDot} />
                </View>
                <View style={styles.tlContent}>
                  <View style={styles.tlHeader}>
                    <Text style={styles.tlName}>{pr.user?.name}</Text>
                    <Badge label={`${pr.percentage}%`} bg="#e0e7ff" text="#4f46e5" />
                  </View>
                  <Text style={styles.tlDate}>{formatDate(pr.progress_date)}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Projects</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.grid, isDesktop && styles.gridLg]}>
          {renderMainContent()}
          {renderSidebar()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  topNav: { paddingHorizontal: 24, paddingVertical: 16 },
  backBtn: { alignSelf: 'flex-start' },
  backTxt: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  scroll: { padding: 24, paddingBottom: 60, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  grid: { flexDirection: 'column', gap: 20 },
  gridLg: { flexDirection: 'row', gap: 20 },
  mainCol: { flex: 2, gap: 16 },
  sideCol: { flex: 1, gap: 16 },
  card: { padding: 20, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  clientTxt: { fontSize: 14, color: '#64748b' },
  clientName: { color: '#334155', fontWeight: '700' },
  dlTxt: { fontSize: 14, fontWeight: '600', color: '#f59e0b', marginTop: 4 },
  overdueTxt: { color: '#ef4444' },
  editBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editTxt: { fontSize: 13, fontWeight: '600', color: '#475569' },
  desc: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  addBtn: { color: '#6366f1', fontSize: 14, fontWeight: '600' },
  progForm: { backgroundColor: '#eef2ff', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  inputMulti: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, minHeight: 80, fontSize: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10, fontSize: 14 },
  formRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  flex1: { flex: 1 },
  saveBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, height: 40, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, height: 40, justifyContent: 'center' },
  btnTextWhite: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnTextDark: { color: '#475569', fontWeight: '600', fontSize: 14 },
  emptyTxt: { textAlign: 'center', color: '#94a3b8', padding: 24, fontSize: 14 },
  progList: { gap: 16 },
  progItem: { flexDirection: 'row', gap: 12 },
  progContent: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 16 },
  progHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  progMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  progTime: { fontSize: 11, color: '#94a3b8' },
  progDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  successBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  purpleBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  secondaryBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  mt4: { marginTop: 16 },
  userList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  userChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  activeChip: { backgroundColor: '#4f46e5' },
  chipTxt: { fontSize: 13, color: '#475569' },
  activeChipTxt: { fontSize: 13, color: '#ffffff' },
  sideTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, marginBottom: 16 },
  dlList: { gap: 12 },
  dlItem: { gap: 4 },
  dt: { fontSize: 12, color: '#94a3b8' },
  dtBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dtBadgeTxt: { fontSize: 11, fontWeight: '600' },
  dd: { fontSize: 14, fontWeight: '600', color: '#334155' },
  ddRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ddName: { fontSize: 14, fontWeight: '500', color: '#334155' },
  ddDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },
  ddLight: { fontSize: 14, color: '#64748b' },
  ddGreen: { fontSize: 14, fontWeight: '500', color: '#10b981' },
  ddPurple: { fontSize: 14, fontWeight: '500', color: '#8b5cf6' },
  timeline: { position: 'relative' },
  tlLine: { position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, backgroundColor: '#f1f5f9' },
  tlItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tlDotContainer: { width: 20, alignItems: 'center' },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4f46e5', borderWidth: 2, borderColor: '#fff', marginTop: 2 },
  tlContent: { flex: 1 },
  tlHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tlName: { fontSize: 12, fontWeight: '600', color: '#334155' },
  tlDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
