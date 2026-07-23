import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DrawerActions } from '@react-navigation/routers';
import { useNavigation } from 'expo-router';
import { teamService } from '../../services/teamService';
import { projectService } from '../../services/projectService';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { DEPT_COLORS } from '../../constants';

const webSelectStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  fontFamily: 'inherit',
};

export default function TeamScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const isFounder = user?.role === 'founder';

  const [deptModal, setDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState<any>({ id: null, name: '', color: 'slate', head_id: '' });

  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState<any>({ id: null, name: '', email: '', password: '', role: 'member', position: '', dept_id: '' });

  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<any>({ user_id: '', dept_id: '' });

  const { data: deptsData, isLoading: loadingDepts, isError: errDepts, refetch: refetchDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: teamService.getDepartments,
    enabled: isFounder,
  });

  const { data: usersData, isLoading: loadingUsers, isError: errUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: teamService.getUsers,
    enabled: isFounder,
  });

  const { data: projsData, isLoading: loadingProjs, isError: errProjs, refetch: refetchProjs } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectService.list(),
    enabled: isFounder,
  });

  const createDeptM = useMutation({ mutationFn: teamService.createDepartment, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setDeptModal(false); } });
  const updateDeptM = useMutation({ mutationFn: (data: any) => teamService.updateDepartment(data.id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setDeptModal(false); } });
  const deleteDeptM = useMutation({ mutationFn: teamService.deleteDepartment, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); } });

  const createUserM = useMutation({ mutationFn: teamService.createUser, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setUserModal(false); } });
  const updateUserM = useMutation({ mutationFn: (data: any) => teamService.updateUser(data.id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setUserModal(false); } });
  const deleteUserM = useMutation({ mutationFn: teamService.deleteUser, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); } });

  if (!isFounder) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Overview</Text>
        </View>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedTxt}>Only founders can view the team overview.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = loadingDepts || loadingUsers || loadingProjs;
  const isError = errDepts || errUsers || errProjs;

  if (isLoading) return <LoadingState message="Loading team..." />;
  if (isError) return <ErrorState onRetry={() => { refetchDepts(); refetchUsers(); refetchProjs(); }} />;

  const departments = deptsData?.departments ?? [];
  const users = usersData?.users ?? [];
  // ProjectController@index returns a paginated Laravel resource collection
  // ({ data: [...], links, meta }), never a bare `{ projects: [...] }` —
  // `projsData?.projects` was always undefined, so this list was silently
  // empty in production (see PRODUCTION_AUDIT.md D-19).
  const projects = projsData?.data ?? [];

  const handleDeptSubmit = () => {
    if (!deptForm.name) return alert('Name required');
    const payload = { ...deptForm, head_id: deptForm.head_id ? Number(deptForm.head_id) : undefined };
    if (deptForm.id) updateDeptM.mutate(payload);
    else createDeptM.mutate(payload);
  };

  const handleUserSubmit = () => {
    if (!userForm.name || !userForm.email || !userForm.role) return alert('Name, Email, Role required');
    if (!userForm.id && !userForm.password) return alert('Password required for new user');
    const payload = {
      ...userForm,
      department_ids: userForm.dept_id ? [Number(userForm.dept_id)] : [],
    };
    if (userForm.id) updateUserM.mutate(payload);
    else createUserM.mutate(payload);
  };

  const handleAssignSubmit = () => {
    if (!assignForm.user_id || !assignForm.dept_id) return alert('Please select a user and a department');
    const payload = {
      id: Number(assignForm.user_id),
      department_ids: [Number(assignForm.dept_id)],
    };
    updateUserM.mutate(payload as any, {
      onSuccess: () => setAssignModal(false)
    });
  };

  const delDept = (id: number) => {
    if (Platform.OS === 'web' && !window.confirm('Delete this department?')) return;
    deleteDeptM.mutate(id);
  };

  const delUser = (id: number) => {
    if (id === user?.id) return alert('Cannot delete yourself!');
    if (Platform.OS === 'web' && !window.confirm('Delete this user?')) return;
    deleteUserM.mutate(id);
  };

  const openEditDept = (d: any) => {
    setDeptForm({ id: d.id, name: d.name, color: d.color || 'slate', head_id: d.head_id ? d.head_id.toString() : '' });
    setDeptModal(true);
  };

  const openEditUser = (u: any) => {
    setUserForm({
      id: u.id, name: u.name, email: u.email, password: '', role: u.role, position: u.position || '',
      dept_id: u.departments?.length ? u.departments[0].id.toString() : '',
    });
    setUserModal(true);
  };

  const unassignedUsers = users.filter((u: any) => !u.departments?.length && u.role !== 'founder');

  const renderDeptItem = ({ item: dept }: { item: any }) => {
    const head = users.find((u: any) => u.id === dept.head_id);
    const members = users.filter((u: any) => u.departments?.some((d: any) => d.id === dept.id));
    const deptProjects = projects.filter((p: any) => p.department_id === dept.id);
    const active = deptProjects.filter((p: any) => ['assigned', 'in_progress'].includes(p.status));
    const dc = DEPT_COLORS[dept.color as keyof typeof DEPT_COLORS] || DEPT_COLORS.slate;

    return (
      <Card style={styles.deptCard}>
        <View style={styles.deptHeader}>
          <View style={styles.deptHeaderInner}>
            <View style={styles.titleRow}>
              <Badge label={dept.name} bg={dc.badge} text={dc.text} />
            </View>
            <Text style={styles.deptMeta}>
              Head: <Text style={styles.headName}>{head?.name || '—'}</Text>
              {' · '}{members.length} members · {active.length}/{deptProjects.length} active projects
            </Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => openEditDept(dept)}>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => delDept(dept.id)}>
              <Text style={styles.delIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.membersGrid}>
          {members.map((u: any) => (
            <View key={u.id} style={styles.memberCard}>
              <Avatar user={u} size="md" />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>{u.name}</Text>
                <Text style={styles.memberPos} numberOfLines={1}>{u.position || 'Member'}</Text>
              </View>
              <View style={styles.memberActions}>
                <TouchableOpacity onPress={() => openEditUser(u)}>
                  <Text style={styles.editIconSmall}>✎</Text>
                </TouchableOpacity>
                {u.id !== user?.id && (
                  <TouchableOpacity onPress={() => delUser(u.id)}>
                    <Text style={styles.delIconSmall}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  const ListFooter = () => {
    if (unassignedUsers.length === 0) return null;
    return (
      <Card style={styles.deptCard}>
        <View style={styles.deptHeader}>
          <Badge label="Unassigned" bg="#f1f5f9" text="#475569" />
        </View>
        <View style={styles.membersGrid}>
          {unassignedUsers.map((u: any) => (
            <View key={u.id} style={styles.memberCard}>
              <Avatar user={u} size="md" />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>{u.name}</Text>
                <Text style={styles.memberPos} numberOfLines={1}>{u.position || 'Member'}</Text>
              </View>
              <View style={styles.memberActions}>
                <TouchableOpacity onPress={() => openEditUser(u)}>
                  <Text style={styles.editIconSmall}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => delUser(u.id)}>
                  <Text style={styles.delIconSmall}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Overview</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setDeptForm({ id: null, name: '', color: 'slate', head_id: '' }); setDeptModal(true); }}
          >
            <Text style={styles.addBtnTxt}>+ Dept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setAssignForm({ user_id: '', dept_id: '' }); setAssignModal(true); }}
          >
            <Text style={styles.addBtnTxt}>+ Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtnPrimary}
            onPress={() => { setUserForm({ id: null, name: '', email: '', password: '', role: 'member', position: '', dept_id: '' }); setUserModal(true); }}
          >
            <Text style={styles.addBtnTxtPrimary}>+ Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Department List */}
      <FlatList
        contentContainerStyle={styles.scroll}
        data={departments}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderDeptItem}
        ListFooterComponent={<ListFooter />}
      />

      {/* Dept Modal */}
      <Modal visible={deptModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{deptForm.id ? 'Edit Department' : 'New Department'}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={deptForm.name || ''}
                onChangeText={t => setDeptForm({ ...deptForm, name: t })}
                placeholder="Department name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(DEPT_COLORS).map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setDeptForm({ ...deptForm, color: c })}
                    style={[
                      styles.colorChip,
                      { backgroundColor: DEPT_COLORS[c as keyof typeof DEPT_COLORS].badge },
                      deptForm.color === c && styles.colorActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Department Head</Text>
              {Platform.OS === 'web' ? (
                <select style={webSelectStyle as any} value={deptForm.head_id} onChange={(e: any) => setDeptForm({ ...deptForm, head_id: e.target.value })}>
                  <option value="">— Select Head —</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id.toString()}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <View style={[styles.input, { padding: 0, justifyContent: 'center' }]}>
                  <Picker
                    selectedValue={deptForm.head_id}
                    onValueChange={(val) => setDeptForm({ ...deptForm, head_id: val })}
                    style={{ height: 48 }}
                  >
                    <Picker.Item label="— Select Head —" value="" color="#94a3b8" />
                    {users.map((u: any) => (
                      <Picker.Item key={u.id} label={u.name} value={u.id.toString()} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleDeptSubmit} disabled={createDeptM.isPending || updateDeptM.isPending}>
                <Text style={styles.btnTxtWhite}>{deptForm.id ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeptModal(false)}>
                <Text style={styles.btnTxtDark}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Modal */}
      <Modal visible={userModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{userForm.id ? 'Edit Member' : 'New Member'}</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput style={styles.input} value={userForm.name || ''} onChangeText={t => setUserForm({ ...userForm, name: t })} placeholder="Full name" placeholderTextColor="#94a3b8" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput style={styles.input} value={userForm.email || ''} onChangeText={t => setUserForm({ ...userForm, email: t })} autoCapitalize="none" placeholder="email@example.com" placeholderTextColor="#94a3b8" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password {userForm.id ? '(Leave blank to keep)' : '*'}</Text>
                <TextInput style={styles.input} value={userForm.password || ''} onChangeText={t => setUserForm({ ...userForm, password: t })} secureTextEntry placeholder="••••••••" placeholderTextColor="#94a3b8" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role *</Text>
                {Platform.OS === 'web' ? (
                  <select style={webSelectStyle as any} value={userForm.role} onChange={(e: any) => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="member">Member</option>
                    <option value="head">Head</option>
                    <option value="accounts">Accounts</option>
                    <option value="founder">Founder</option>
                  </select>
                ) : (
                  <TextInput style={styles.input} value={userForm.role || ''} onChangeText={t => setUserForm({ ...userForm, role: t })} placeholder="member, head, accounts, founder" placeholderTextColor="#94a3b8" />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Position</Text>
                <TextInput style={styles.input} value={userForm.position || ''} onChangeText={t => setUserForm({ ...userForm, position: t })} placeholder="e.g. Senior Designer" placeholderTextColor="#94a3b8" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Department</Text>
                {Platform.OS === 'web' ? (
                  <select style={webSelectStyle as any} value={userForm.dept_id} onChange={(e: any) => setUserForm({ ...userForm, dept_id: e.target.value })}>
                    <option value="">— None —</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id.toString()}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <TextInput style={styles.input} value={userForm.dept_id?.toString() || ''} onChangeText={t => setUserForm({ ...userForm, dept_id: t })} placeholder="Dept ID" placeholderTextColor="#94a3b8" />
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleUserSubmit} disabled={createUserM.isPending || updateUserM.isPending}>
                  <Text style={styles.btnTxtWhite}>{userForm.id ? 'Update' : 'Create'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setUserModal(false)}>
                  <Text style={styles.btnTxtDark}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={assignModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Existing Member</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Member *</Text>
              {Platform.OS === 'web' ? (
                <select style={webSelectStyle as any} value={assignForm.user_id} onChange={(e: any) => setAssignForm({ ...assignForm, user_id: e.target.value })}>
                  <option value="">— Select Member —</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id.toString()}>{u.name} ({u.email})</option>
                  ))}
                </select>
              ) : (
                <View style={[styles.input, { padding: 0, justifyContent: 'center' }]}>
                  <Picker
                    selectedValue={assignForm.user_id}
                    onValueChange={(val) => setAssignForm({ ...assignForm, user_id: val })}
                    style={{ height: 48 }}
                  >
                    <Picker.Item label="— Select Member —" value="" color="#94a3b8" />
                    {users.map((u: any) => (
                      <Picker.Item key={u.id} label={`${u.name} (${u.email})`} value={u.id.toString()} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Department *</Text>
              {Platform.OS === 'web' ? (
                <select style={webSelectStyle as any} value={assignForm.dept_id} onChange={(e: any) => setAssignForm({ ...assignForm, dept_id: e.target.value })}>
                  <option value="">— Select Department —</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id.toString()}>{d.name}</option>
                  ))}
                </select>
              ) : (
                <View style={[styles.input, { padding: 0, justifyContent: 'center' }]}>
                  <Picker
                    selectedValue={assignForm.dept_id}
                    onValueChange={(val) => setAssignForm({ ...assignForm, dept_id: val })}
                    style={{ height: 48 }}
                  >
                    <Picker.Item label="— Select Department —" value="" color="#94a3b8" />
                    {departments.map((d: any) => (
                      <Picker.Item key={d.id} label={d.name} value={d.id.toString()} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAssignSubmit} disabled={updateUserM.isPending}>
                <Text style={styles.btnTxtWhite}>Assign</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAssignModal(false)}>
                <Text style={styles.btnTxtDark}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9',
  },
  menuBtn: { marginRight: 16 },
  menuIcon: { fontSize: 24, color: '#475569' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  headerActions: { flexDirection: 'row', gap: 8 },
  addBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnTxt: { color: '#475569', fontWeight: '600', fontSize: 13 },
  addBtnPrimary: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnTxtPrimary: { color: '#fff', fontWeight: '600', fontSize: 13 },

  scroll: { padding: 24, maxWidth: 1200, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  unauthorized: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unauthorizedTxt: { color: '#94a3b8', fontSize: 16 },

  deptCard: { padding: 20, marginBottom: 20 },
  deptHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9',
  },
  deptHeaderInner: { flex: 1 },
  titleRow: { flexDirection: 'row', marginBottom: 8 },
  deptMeta: { fontSize: 14, color: '#64748b' },
  headName: { fontWeight: '700', color: '#334155' },
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  editIcon: { fontSize: 16, color: '#64748b' },
  delIcon: { fontSize: 16, color: '#ef4444' },

  membersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 12,
    width: Platform.OS === 'web' ? '23%' : '48%', minWidth: 200, flexGrow: 1,
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  memberPos: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  memberActions: { flexDirection: 'row', gap: 8 },
  editIconSmall: { fontSize: 12, color: '#64748b' },
  delIconSmall: { fontSize: 12, color: '#ef4444' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: '#1e293b',
  },
  colorChip: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorActive: { borderColor: '#1e293b' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  saveBtn: { flex: 1, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  btnTxtWhite: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnTxtDark: { color: '#475569', fontWeight: '600', fontSize: 14 },
});
