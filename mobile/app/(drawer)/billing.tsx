import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DrawerActions } from '@react-navigation/routers';
import { useRouter, useNavigation } from 'expo-router';
import { billingService } from '../../services/billingService';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { formatDate } from '../../utils';
import { DEPT_COLORS } from '../../constants';
import { generateInvoicePDF } from '../../utils/invoicePdf';

export default function BillingScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [showBilled, setShowBilled] = React.useState(false);

  const canView = user?.role === 'founder' || user?.role === 'accounts';

  const { data: usersData, isLoading: loadUsers } = useQuery({
    queryKey: ['users'],
    queryFn: teamService.getUsers,
    enabled: canView,
  });

  const { data: billingData, isLoading: loadBill, isError, refetch } = useQuery({
    queryKey: ['billing-dash'],
    queryFn: billingService.getBilling,
    enabled: canView,
  });

  const markMutation = useMutation({
    mutationFn: (id: number) => projectService.markBilled(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['billing-dash'] }),
  });

  const handleMarkBilled = (p: any) => {
    router.push(`/bills/${p.id}`);
  };

  if (!canView) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Billing & Accounts</Text>
        </View>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedTxt}>Only Accounts and Founder roles can view billing.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = loadUsers || loadBill;
  if (isLoading) return <LoadingState message="Loading billing data..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const users = usersData?.users ?? [];
  const overview = billingData?.overview || {};
  const unbilled = billingData?.unbilled_projects || [];
  const billed = billingData?.billed_projects || [];
  const deptOverview = billingData?.department_overview || [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Accounts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Stats Row */}
        <View style={[styles.statsRow, isDesktop && styles.statsRowDesktop]}>
          <Card style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.statIcon}>⏳</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBilled(false)}>
              <Text style={[styles.statVal, !showBilled && { color: '#4f46e5' }]}>{overview.total_unbilled || 0}</Text>
              <Text style={styles.statLabel}>Unbilled Projects</Text>
            </TouchableOpacity>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#d1fae5' }]}>
              <Text style={styles.statIcon}>💰</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBilled(true)}>
              <Text style={[styles.statVal, showBilled && { color: '#4f46e5' }]}>{overview.total_billed || 0}</Text>
              <Text style={styles.statLabel}>Billed This Month</Text>
            </TouchableOpacity>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.statIcon}>🏢</Text>
            </View>
            <Text style={styles.statVal}>{overview.active_departments || 0}</Text>
            <Text style={styles.statLabel}>Active Depts</Text>
          </Card>
        </View>

        <View style={[styles.grid, isDesktop && styles.gridLg]}>
          {/* Main List */}
          <View style={styles.mainCol}>
            <Text style={styles.sectionTitle}>{showBilled ? 'Billed Projects' : 'Ready to Bill (Completed)'}</Text>
            <Card style={styles.listCard}>
              {showBilled ? (
                billed.length === 0 ? (
                  <Text style={styles.emptyTxt}>No billed projects.</Text>
                ) : (
                  <View style={styles.table}>
                    <View style={styles.thRow}>
                      <Text style={[styles.th, { flex: 2 }]}>Project</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Client Name</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Billed Date</Text>
                      <Text style={[styles.th, { width: 140 }]}></Text>
                    </View>
                    {billed.map((p: any) => {
                      const u = users.find((x: any) => x.id === p.assigned_to) || p.user;
                      const dc = p.department?.color ? (DEPT_COLORS[p.department.color] ?? DEPT_COLORS.slate) : DEPT_COLORS.slate;
                      return (
                        <View key={p.id} style={styles.tr}>
                          <View style={[styles.td, { flex: 2 }]}>
                            <Text style={styles.pTitle}>{p.title}</Text>
                            <View style={styles.pMeta}>
                              <Badge label={p.department?.name || 'Dept'} bg={dc.badge} text={dc.text} />
                              <View style={styles.pUser}>
                                <Avatar user={u} size="sm" />
                                <Text style={styles.pUserName}>{u?.name}</Text>
                              </View>
                            </View>
                          </View>
                          <Text style={[styles.td, styles.tdDim, { flex: 1 }]} numberOfLines={2}>{p.client || '—'}</Text>
                          <Text style={[styles.td, styles.tdDim, { flex: 1 }]}>{p.billed_at ? formatDate(p.billed_at) : '—'}</Text>
                          <View style={[styles.td, { width: 140, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }]}>
                            <TouchableOpacity style={[styles.billBtn, { backgroundColor: '#4f46e5' }]} onPress={() => router.push(`/bills/${p.id}`)}>
                              <Text style={styles.btnTxtWhite}>View Bill</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )
              ) : (
                unbilled.length === 0 ? (
                  <Text style={styles.emptyTxt}>No unbilled completed projects.</Text>
                ) : (
                  <View style={styles.table}>
                    <View style={styles.thRow}>
                      <Text style={[styles.th, { flex: 2 }]}>Project</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Client Name</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Completed</Text>
                      <Text style={[styles.th, { width: 100 }]}></Text>
                    </View>
                    {unbilled.map((p: any) => {
                      const u = users.find((x: any) => x.id === p.assigned_to) || p.user;
                      const dc = p.department?.color ? (DEPT_COLORS[p.department.color] ?? DEPT_COLORS.slate) : DEPT_COLORS.slate;
                      return (
                        <View key={p.id} style={styles.tr}>
                          <View style={[styles.td, { flex: 2 }]}>
                            <Text style={styles.pTitle}>{p.title}</Text>
                            <View style={styles.pMeta}>
                              <Badge label={p.department?.name || 'Dept'} bg={dc.badge} text={dc.text} />
                              <View style={styles.pUser}>
                                <Avatar user={u} size="sm" />
                                <Text style={styles.pUserName}>{u?.name}</Text>
                              </View>
                            </View>
                          </View>
                          <Text style={[styles.td, styles.tdDim, { flex: 1 }]} numberOfLines={2}>{p.client || '—'}</Text>
                          <Text style={[styles.td, styles.tdDim, { flex: 1 }]}>{p.completed_at ? formatDate(p.completed_at) : '—'}</Text>
                          <View style={[styles.td, { width: 100, alignItems: 'flex-end' }]}>
                            <TouchableOpacity style={styles.billBtn} onPress={() => handleMarkBilled(p)}>
                              <Text style={styles.btnTxtWhite}>Create Bill</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )
              )}
            </Card>
          </View>

          {/* Sidebar Department Overview */}
          <View style={styles.sideCol}>
            <Text style={styles.sectionTitle}>Department Overview</Text>
            <Card style={styles.listCard}>
              {deptOverview.length === 0 ? (
                <Text style={styles.emptyTxt}>No department data.</Text>
              ) : (
                <View style={styles.deptList}>
                  {deptOverview.map((d: any, idx: number) => {
                    const dc = DEPT_COLORS[d.color] || DEPT_COLORS.slate;
                    return (
                      <View key={d.id || idx} style={styles.deptItem}>
                        <View style={styles.deptRow}>
                          <Badge label={d.name} bg={dc.badge} text={dc.text} />
                          <Text style={styles.deptMembers}>{d.members_count} members</Text>
                        </View>
                        <View style={styles.deptStats}>
                          <View style={styles.dStat}>
                            <Text style={styles.dStatVal}>{d.unbilled_count}</Text>
                            <Text style={styles.dStatLabel}>Unbilled</Text>
                          </View>
                          <View style={styles.dStatSep} />
                          <View style={styles.dStat}>
                            <Text style={styles.dStatVal}>{d.billed_count}</Text>
                            <Text style={styles.dStatLabel}>Billed</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  menuBtn: { marginRight: 16 },
  menuIcon: { fontSize: 24, color: '#475569' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  scroll: { padding: 24, maxWidth: 1200, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  unauthorized: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unauthorizedTxt: { color: '#94a3b8', fontSize: 16 },

  statsRow: { flexDirection: 'column', gap: 16, marginBottom: 24 },
  statsRowDesktop: { flexDirection: 'row' },
  statCard: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  statIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statIcon: { fontSize: 24 },
  statVal: { fontSize: 32, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },

  grid: { flexDirection: 'column', gap: 20 },
  gridLg: { flexDirection: 'row', gap: 20 },
  mainCol: { flex: 2, gap: 16 },
  sideCol: { flex: 1, gap: 16 },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12 },
  listCard: { padding: 0, overflow: 'hidden' },
  emptyTxt: { padding: 32, textAlign: 'center', color: '#94a3b8' },
  
  table: { width: '100%' },
  thRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 12, paddingHorizontal: 16 },
  th: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#f8fafc', paddingVertical: 16, paddingHorizontal: 16 },
  td: { },
  tdDim: { fontSize: 13, color: '#64748b' },
  pTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  pMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pUser: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pUserName: { fontSize: 12, color: '#475569' },
  billBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnTxtWhite: { color: '#fff', fontWeight: '600', fontSize: 13 },
  
  deptList: { width: '100%' },
  deptItem: { padding: 16, borderBottomWidth: 1, borderColor: '#f8fafc' },
  deptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deptMembers: { fontSize: 12, color: '#64748b' },
  deptStats: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  dStat: { flex: 1, alignItems: 'center' },
  dStatSep: { width: 1, backgroundColor: '#e2e8f0' },
  dStatVal: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  dStatLabel: { fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'uppercase' },
});
