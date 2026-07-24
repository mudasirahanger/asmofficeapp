import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DrawerActions } from '@react-navigation/routers';
import { useRouter, useNavigation } from 'expo-router';
import { clientService } from '../../services/clientService';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState, EmptyState } from '../../components/shared/States';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils';
import { ClientSummary } from '../../types';

const CAN_VIEW_ROLES = ['founder', 'head', 'accounts'];

type ClientModalState = { mode: 'create' } | { mode: 'edit'; id: number; currentName: string };

export default function ClientsScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ClientModalState | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [modalError, setModalError] = useState('');

  const canView = !!user?.role && CAN_VIEW_ROLES.includes(user.role);
  const isFounder = user?.role === 'founder';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.list,
    enabled: canView,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clients'] });

  const createMutation = useMutation({
    mutationFn: (name: string) => clientService.create(name),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err: any) => setModalError(err.response?.data?.message || 'Failed to create client'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => clientService.rename(id, name),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err: any) => setModalError(err.response?.data?.message || 'Failed to rename client'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientService.remove(id),
    onSuccess: () => invalidate(),
    onError: (err: any) => {
      const message = err.response?.status === 409
        ? (err.response?.data?.message || 'This client is linked to one or more projects and cannot be deleted.')
        : (err.response?.data?.message || 'Failed to delete client.');
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        alert(message);
      }
    },
  });

  const openCreate = () => { setModal({ mode: 'create' }); setNameInput(''); setModalError(''); };
  const openEdit = (c: ClientSummary) => { setModal({ mode: 'edit', id: c.id, currentName: c.name }); setNameInput(c.name); setModalError(''); };
  const closeModal = () => { setModal(null); setNameInput(''); setModalError(''); };

  const handleSaveModal = () => {
    if (!nameInput.trim()) { setModalError('Name is required'); return; }
    if (!modal) return;
    if (modal.mode === 'create') createMutation.mutate(nameInput.trim());
    else renameMutation.mutate({ id: modal.id, name: nameInput.trim() });
  };

  const handleDelete = (c: ClientSummary) => {
    if (Platform.OS === 'web' && !window.confirm(`Delete "${c.name}"? This only works if no projects reference it.`)) return;
    deleteMutation.mutate(c.id);
  };

  if (!canView) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clients</Text>
        </View>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedTxt}>Only Founder, Head, and Accounts roles can view clients.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) return <LoadingState message="Loading clients..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const clients: ClientSummary[] = data?.clients || [];
  const filtered = search.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : clients;

  const goToProjects = (clientName: string) => {
    router.push({ pathname: '/(drawer)/projects', params: { client: clientName } } as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clients</Text>
        {isFounder && (
          <TouchableOpacity style={styles.addBtn} onPress={openCreate} testID="add-client-btn">
            <Text style={styles.addBtnText}>＋ Add Client</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <Card style={styles.listCard}>
          {clients.length === 0 ? (
            <EmptyState title="No clients yet" subtitle="Clients appear here automatically once a project names one." icon="🏢" />
          ) : filtered.length === 0 ? (
            <Text style={styles.emptyTxt}>No clients match "{search}".</Text>
          ) : (
            <View style={styles.table} testID="clients-table">
              {isDesktop && (
                <View style={styles.thRow}>
                  <Text style={[styles.th, { flex: 2 }]}>Client</Text>
                  <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>Active</Text>
                  <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Completed</Text>
                  <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>Billed</Text>
                  <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>Overdue</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Last Activity</Text>
                  {isFounder && <Text style={[styles.th, { width: 96, textAlign: 'right' }]}>Actions</Text>}
                </View>
              )}
              {filtered.map((c) => (
                <View key={c.id} testID={`client-row-${c.name}`} style={styles.tr}>
                  <TouchableOpacity style={[styles.td, { flex: 2 }]} onPress={() => goToProjects(c.name)}>
                    <Text style={styles.clientName}>{c.name}</Text>
                    <Text style={styles.clientSub}>{c.total_projects} project{c.total_projects === 1 ? '' : 's'}</Text>
                  </TouchableOpacity>
                  {isDesktop ? (
                    <>
                      <Text style={[styles.tdVal, { width: 90, textAlign: 'center' }]}>{c.active_projects}</Text>
                      <Text style={[styles.tdVal, { width: 100, textAlign: 'center' }]}>{c.completed_projects}</Text>
                      <Text style={[styles.tdVal, { width: 90, textAlign: 'center' }]}>{c.billed_projects}</Text>
                      <View style={{ width: 90, alignItems: 'center' }}>
                        {c.overdue_projects > 0 ? (
                          <Badge label={String(c.overdue_projects)} bg="#fee2e2" text="#b91c1c" />
                        ) : (
                          <Text style={styles.tdVal}>—</Text>
                        )}
                      </View>
                      <Text style={[styles.tdDim, { flex: 1 }]}>{c.last_activity ? formatDate(c.last_activity) : '—'}</Text>
                    </>
                  ) : (
                    <View style={styles.mobileBadges}>
                      {c.active_projects > 0 && <Badge label={`${c.active_projects} active`} bg="#e0e7ff" text="#4338ca" />}
                      {c.overdue_projects > 0 && <Badge label={`${c.overdue_projects} overdue`} bg="#fee2e2" text="#b91c1c" />}
                    </View>
                  )}
                  {isFounder && (
                    <View style={styles.actionsCol}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => openEdit(c)}
                        testID={`edit-client-${c.name}`}
                      >
                        <Text style={styles.iconBtnTxt}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleDelete(c)}
                        disabled={deleteMutation.isPending}
                        testID={`delete-client-${c.name}`}
                      >
                        <Text style={[styles.iconBtnTxt, { color: '#ef4444' }]}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Add / Rename Client Modal */}
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modal?.mode === 'edit' ? 'Rename Client' : 'Add Client'}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Name *</Text>
              <TextInput
                style={[styles.input, modalError ? styles.inputError : null]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g. Acme Corp"
                placeholderTextColor="#94a3b8"
                autoFocus
                testID="client-modal-name-input"
              />
              {modalError ? <Text style={styles.errorInline}>{modalError}</Text> : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.saveBtn, { flex: 1 }]}
                onPress={handleSaveModal}
                disabled={createMutation.isPending || renameMutation.isPending}
                testID="client-modal-save-btn"
              >
                {(createMutation.isPending || renameMutation.isPending) ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  menuBtn: { marginRight: 16 },
  menuIcon: { fontSize: 24, color: '#475569' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', flex: 1 },
  addBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scroll: { padding: 24, maxWidth: 1100, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  unauthorized: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unauthorizedTxt: { color: '#94a3b8', fontSize: 16 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  clearIcon: { color: '#94a3b8', fontSize: 16 },

  listCard: { padding: 0, overflow: 'hidden' },
  emptyTxt: { padding: 32, textAlign: 'center', color: '#94a3b8' },

  table: { width: '100%' },
  thRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 12, paddingHorizontal: 16 },
  th: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 16 },
  td: {},
  tdVal: { fontSize: 14, fontWeight: '600', color: '#334155' },
  tdDim: { fontSize: 13, color: '#64748b' },
  clientName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  clientSub: { fontSize: 12, color: '#94a3b8' },
  mobileBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  actionsCol: { width: 96, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  iconBtnTxt: { fontSize: 14, color: '#475569' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', alignSelf: 'center',
    ...Platform.select({ web: { boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }),
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  inputGroup: { marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1e293b' },
  inputError: { borderColor: '#ef4444' },
  errorInline: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  saveBtn: { backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtn: { backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontSize: 14, fontWeight: '600' },
});
