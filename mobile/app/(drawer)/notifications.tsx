import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DrawerActions } from '@react-navigation/routers';
import { useNavigation, useRouter } from 'expo-router';
import { notificationService } from '../../services/notificationService';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { Card } from '../../components/ui/Card';
import { formatDateTime } from '../../utils';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
  });

  const readMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <LoadingState message="Loading notifications..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleNotifClick = (n: any) => {
    if (!n.is_read) readMutation.mutate(n.id);
    if (n.data?.project_id) {
      router.push(`/projects/${n.data.project_id}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={() => readAllMutation.mutate()}>
            <Text style={styles.markAllTxt}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTxt}>You're all caught up!</Text>
            <Text style={styles.emptySub}>No notifications at the moment.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((n: any) => (
              <TouchableOpacity key={n.id} onPress={() => handleNotifClick(n)}>
                <View style={[styles.card, !n.is_read && styles.unreadCard] as any}>
                  <View style={styles.nRow}>
                    <View style={styles.nContent}>
                      <Text style={[styles.title, !n.is_read && styles.unreadTitle]}>{n.title}</Text>
                      <Text style={styles.msg}>{n.message}</Text>
                      <Text style={styles.time}>{formatDateTime(n.created_at)}</Text>
                    </View>
                    {!n.is_read && <View style={styles.unreadDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  menuBtn: { marginRight: 16 },
  menuIcon: { fontSize: 24, color: '#475569' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', flex: 1 },
  markAllBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  markAllTxt: { fontSize: 13, fontWeight: '600', color: '#475569' },
  
  scroll: { padding: 24, maxWidth: 800, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  
  list: { gap: 12 },
  card: { padding: 16, backgroundColor: '#fff' },
  unreadCard: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 },
  nRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nContent: { flex: 1, paddingRight: 16 },
  title: { fontSize: 15, color: '#334155', marginBottom: 4 },
  unreadTitle: { fontWeight: '700', color: '#1e293b' },
  msg: { fontSize: 14, color: '#475569', lineHeight: 20 },
  time: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', marginTop: 4 },
  
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTxt: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748b' },
});
