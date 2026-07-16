import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, useWindowDimensions
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/routers';
import { SafeAreaView } from 'react-native-safe-area-context';
import { billingService } from '../../services/billingService';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { AppUpdater } from '../../components/shared/AppUpdater';
import { DEPT_COLORS } from '../../constants';
import { ProjectCard } from '../../components/project/ProjectCard';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  billingService.getDashboard,
  });

  if (isLoading) return <LoadingState message="Loading dashboard..." />;
  if (isError)   return <ErrorState onRetry={refetch} />;

  const stats   = data?.stats   ?? {};
  const deptOvw = data?.department_overview ?? [];
  const active  = data?.active_projects     ?? [];
  const overdue = data?.overdue_projects    ?? active.filter((p: any) => {
    if (!p.deadline || p.status === 'completed' || p.status === 'billed') return false;
    return p.deadline.split('T')[0] < new Date().toISOString().split('T')[0];
  });
  const leaves  = data?.pending_leaves      ?? [];
  const isFounder = user?.role === 'founder';
  const isHead = user?.role === 'head';
  const isAccounts = user?.role === 'accounts';

  // Stat card 4th depends on role
  const stat4 = (isFounder || isAccounts)
    ? { label: 'Pending Billing', value: stats.pending_billing    ?? 0, icon: '💰', color: '#f59e0b', iconBg: '#fef3c7' }
    : { label: 'My Leaves',       value: stats.my_pending_leaves  ?? 0, icon: '🌿', color: '#8b5cf6', iconBg: '#ede9fe' };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View style={styles.header}>
        {!isDesktop && (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerTitle}>
          <Text style={styles.userName}>Welcome, {user?.name} 👋</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <AppUpdater />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.content}>
          {/* Stats Grid — 2 cols on mobile, 4 on desktop, matching index.html */}
          <View style={styles.statsGrid}>
            <StatCard label="Active Projects" value={stats.active_projects ?? 0} icon="📁" color="#4f46e5" iconBg="#eef2ff" />
            <StatCard label="Completed"       value={stats.completed       ?? 0} icon="✅" color="#059669" iconBg="#d1fae5" />
            <StatCard label="Overdue"         value={stats.overdue         ?? 0} icon="⚠️" color={stats.overdue ? '#dc2626' : '#4f46e5'} iconBg={stats.overdue ? '#fee2e2' : '#eef2ff'} />
            <StatCard label={stat4.label}     value={stat4.value}               icon={stat4.icon} color={stat4.color} iconBg={stat4.iconBg} />
          </View>

          {/* Department Overview — Founder only */}
          {isFounder && deptOvw.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Department Overview</Text>
              <View style={styles.deptGrid}>
                {deptOvw.map((dept: any) => {
                  const dc = DEPT_COLORS[dept.color] ?? DEPT_COLORS.slate;
                  return (
                    <TouchableOpacity
                      key={dept.id}
                      style={[styles.deptCard, { backgroundColor: dc.bg, borderColor: dc.border }]}
                      onPress={() => router.push('/(drawer)/projects' as any)}
                    >
                      <Text style={[styles.deptName, { color: dc.text }]} numberOfLines={1}>{dept.name}</Text>
                      <Text style={styles.deptHead} numberOfLines={1}>
                        Head: {dept.head_name || '—'}
                      </Text>
                      <View style={styles.deptStats}>
                        <Text style={[styles.deptCount, { color: dc.text }]}>{dept.active_count}</Text>
                        <Text style={styles.deptCountLabel}>/ {dept.total_count ?? dept.active_count} active</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Two-column layout on desktop */}
          <View style={[styles.bottomRow, isDesktop && styles.bottomRowDesktop]}>
            {/* Active Projects */}
            <View style={styles.bottomCol}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Projects</Text>
                <TouchableOpacity onPress={() => router.push('/(drawer)/projects' as any)}>
                  <Text style={styles.viewAllText}>View all →</Text>
                </TouchableOpacity>
              </View>
              {active.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No active projects</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {active.slice(0, 5).map((p: any) => <ProjectCard key={p.id} project={p} />)}
                </View>
              )}
            </View>

            {/* Right column: Overdue + Pending Leaves */}
            <View style={styles.bottomCol}>
              {overdue.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>⚠ Overdue</Text>
                  <View style={{ gap: 10, marginTop: 12 }}>
                    {overdue.slice(0, 3).map((p: any) => <ProjectCard key={p.id} project={p} />)}
                  </View>
                </View>
              )}

              {(isFounder || isHead) && (
                <View>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Pending Leaves</Text>
                    <TouchableOpacity onPress={() => router.push('/(drawer)/leaves' as any)}>
                      <Text style={styles.viewAllText}>Manage →</Text>
                    </TouchableOpacity>
                  </View>
                  {leaves.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>No pending requests</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {leaves.slice(0, 4).map((l: any) => (
                        <View key={l.id} style={styles.leaveCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Avatar user={l.user} size="sm" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.leaveName} numberOfLines={1}>
                                {l.user?.name} — {l.type}
                              </Text>
                              <Text style={styles.leaveDates}>
                                {formatDate(l.start_date)} – {formatDate(l.end_date)}
                              </Text>
                            </View>
                            <Badge label="Pending" bg="#fef3c7" text="#92400e" />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color, iconBg }: {
  label: string; value: number; icon: string; color: string; iconBg: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <View style={[styles.statIconBox, { backgroundColor: iconBg }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  menuBtn:     { padding: 4 },
  menuIcon:    { fontSize: 22, color: '#475569' },
  headerTitle: { flex: 1 },
  userName:    { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  dateText:    { fontSize: 13, color: '#64748b', marginTop: 2 },

  scroll: { flex: 1 },
  content: { padding: 16, maxWidth: 1200, alignSelf: 'center', width: '100%' },

  // Stats: 2 per row on small, 4 on desktop
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.05)',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statInfo:  { gap: 2, flex: 1 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  statValue: { fontSize: 26, fontWeight: '800', color: '#1e293b', marginTop: 2 },
  statIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statIcon:  { fontSize: 20 },

  section:      { marginBottom: 24 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  viewAllText:  { fontSize: 13, color: '#6366f1', fontWeight: '600' },

  // Dept grid: 2 col on mobile, 3 on desktop
  deptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  deptCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    minWidth: 140,
    flex: 1,
  },
  deptName:       { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  deptHead:       { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  deptStats:      { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  deptCount:      { fontSize: 22, fontWeight: '800' },
  deptCountLabel: { fontSize: 12, color: '#94a3b8' },

  bottomRow: { flexDirection: 'column', gap: 24 },
  bottomRowDesktop: { flexDirection: 'row' },
  bottomCol: { flex: 1 },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
    elevation: 1,
  },
  emptyText: { fontSize: 14, color: '#94a3b8' },

  leaveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  leaveName:  { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  leaveDates: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
