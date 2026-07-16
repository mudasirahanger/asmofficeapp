import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/routers';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation();
  const router     = useRouter();

  const handleLogout = async () => {
    const doLogout = async () => {
      await logout();
      router.replace('/login');
    };

    if (Platform.OS === 'web') {
      // Alert.alert doesn't work reliably on web
      if (window.confirm('Are you sure you want to logout?')) {
        await doLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const roleLabel: Record<string, string> = {
    founder: '🏢 Founder / Director',
    head:    '👑 Department Head',
    member:  '👤 Team Member',
    accounts:'💼 Accounts',
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarSection}>
          <Avatar user={user ?? undefined} size="lg" />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>{roleLabel[user?.role ?? 'member']}</Text>
          {user?.position && <Text style={styles.position}>{user.position}</Text>}
        </View>

        <Card style={styles.infoCard}>
          <InfoRow label="Username" value={user?.username ?? '—'} />
          <InfoRow label="Role"     value={user?.role ?? '—'} />
          <InfoRow label="Position" value={user?.position ?? '—'} />
          {user?.departments?.length ? (
            <InfoRow label="Department" value={user.departments.map((d: any) => d.name).join(', ')} />
          ) : null}
        </Card>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>↩ Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  menuBtn:  { padding: 4 },
  menuIcon: { fontSize: 20, color: '#475569' },
  title:    { flex: 1, fontSize: 17, fontWeight: '700', color: '#1e293b' },
  body:     { flex: 1, padding: 20, gap: 16 },

  avatarSection: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  name:     { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  role:     { fontSize: 14, color: '#6366f1', fontWeight: '600' },
  position: { fontSize: 13, color: '#94a3b8' },

  infoCard: { gap: 14 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  rowValue: { fontSize: 13, color: '#1e293b', fontWeight: '600', flex: 1, textAlign: 'right' },

  logoutBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: 14, padding: 16,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
});
