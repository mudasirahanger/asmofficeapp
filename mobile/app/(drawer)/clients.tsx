import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
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

export default function ClientsScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [search, setSearch] = useState('');

  const canView = !!user?.role && CAN_VIEW_ROLES.includes(user.role);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.list,
    enabled: canView,
  });

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
                </View>
              )}
              {filtered.map((c) => (
                <TouchableOpacity key={c.name} testID={`client-row-${c.name}`} style={styles.tr} onPress={() => goToProjects(c.name)}>
                  <View style={[styles.td, { flex: 2 }]}>
                    <Text style={styles.clientName}>{c.name}</Text>
                    <Text style={styles.clientSub}>{c.total_projects} project{c.total_projects === 1 ? '' : 's'}</Text>
                  </View>
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
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  menuBtn: { marginRight: 16 },
  menuIcon: { fontSize: 24, color: '#475569' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  scroll: { padding: 24, maxWidth: 1000, alignSelf: 'center', width: '100%', paddingBottom: 60 },
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
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#f8fafc', paddingVertical: 16, paddingHorizontal: 16 },
  td: {},
  tdVal: { fontSize: 14, fontWeight: '600', color: '#334155' },
  tdDim: { fontSize: 13, color: '#64748b' },
  clientName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  clientSub: { fontSize: 12, color: '#94a3b8' },
  mobileBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
