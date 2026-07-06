import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { notificationService } from '../../services/notificationService';
import { Avatar } from '../ui/Avatar';
import { AppUpdater } from '../shared/AppUpdater';

const NAV_ITEMS = [
  { id: 'dashboard',   route: '/(drawer)/dashboard',       icon: '⊞', label: 'Dashboard',   roles: ['founder', 'head', 'member', 'accounts'] },
  { id: 'analytics',   route: '/(drawer)/analytics',       icon: '📊', label: 'Analytics',   roles: ['founder', 'hr'] },
  { id: 'projects',    route: '/(drawer)/projects',        icon: '📁', label: 'Projects',    roles: ['founder', 'head', 'member', 'accounts'] },
  { id: 'create_proj', route: '/(drawer)/projects/create', icon: '＋', label: 'New Project', roles: ['founder', 'head'] },
  { id: 'attendance',  route: '/(drawer)/attendance',      icon: '📅', label: 'Attendance',  roles: ['founder', 'head', 'member', 'accounts'] },
  { id: 'leaves',      route: '/(drawer)/leaves',          icon: '🌿', label: 'Leaves',      roles: ['founder', 'head', 'member', 'accounts'] },
  { id: 'team',        route: '/(drawer)/team',            icon: '👥', label: 'Team',        roles: ['founder'] },
  { id: 'billing',     route: '/(drawer)/billing',         icon: '💰', label: 'Billing',     roles: ['founder', 'accounts'] },
  { id: 'notifs',      route: '/(drawer)/notifications',   icon: '🔔', label: 'Notifications', roles: ['founder', 'head', 'member', 'accounts', 'hr', 'reception'] },
  { id: 'changelog',   route: '/(drawer)/changelog',       icon: '📝', label: 'Changelog',   roles: ['founder', 'head', 'member', 'accounts', 'hr', 'reception'] },
  { id: 'documentation',route: '/(drawer)/documentation',  icon: '📖', label: 'Documentation', roles: ['founder', 'head', 'member', 'accounts', 'hr', 'reception'] },
  { id: 'settings',    route: '/(drawer)/settings',        icon: '⚙️', label: 'Settings',    roles: ['founder', 'hr'] },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  const role = user?.role ?? 'member';
  
  const visibleItems = NAV_ITEMS.filter((item) => {
    return item.roles.includes(role);
  });

  // Fetch unread notifications count
  const { data: notifsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
    refetchInterval: 15000, // fetch every 15s to be more responsive for notifications
  });
  const unreadCount = (notifsData?.notifications ?? []).filter((n: any) => !n.is_read).length;

  const [notifiedIds, setNotifiedIds] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
      const newNotifs = (notifsData?.notifications ?? []).filter((n: any) => !n.is_read && !notifiedIds.has(n.id));
      
      if (newNotifs.length > 0) {
        newNotifs.forEach((n: any) => {
          new Notification(n.title || 'New Notification', { body: n.message });
          setNotifiedIds(prev => new Set(prev).add(n.id));
        });
      }
    } else if (notifsData?.notifications?.length) {
      // Just track them so we don't spam if permission is granted later
      const newNotifs = (notifsData.notifications).filter((n: any) => !n.is_read && !notifiedIds.has(n.id));
      if (newNotifs.length > 0) {
        newNotifs.forEach((n: any) => setNotifiedIds(prev => new Set(prev).add(n.id)));
      }
    }
  }, [notifsData]);

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace('/login');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) doLogout();
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const isActive = (route: string): boolean => {
    if (route === '/(drawer)/dashboard' && pathname === '/dashboard') return true;
    if (route === '/(drawer)/projects' && (pathname === '/projects' || pathname.startsWith('/projects/'))) {
      if (pathname === '/projects/create') return false;
      return true;
    }
    if (route === '/(drawer)/projects/create' && pathname === '/projects/create') return true;
    if (route === '/(drawer)/notifications' && pathname === '/notifications') return true;
    return pathname.includes(route.replace('/(drawer)', ''));
  };

  return (
    <View style={styles.container}>
      {/* Header Logo */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoChar}>AM</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.brandTitle}>Office Hub</Text>
              <View style={{ backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700' }}>v1.1.9</Text>
              </View>
            </View>
            <Text style={styles.brandSub}>Management System</Text>
          </View>
        </View>
        {Platform.OS === 'web' && (
          <View style={{ marginTop: 12 }}>
            <AppUpdater />
          </View>
        )}
      </View>

      {/* Nav Links */}
      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => {
          const active = isActive(item.route);
          const showBadge = item.id === 'notifs' && unreadCount > 0;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text>
              <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Profile + Logout */}
      <View style={styles.footer}>
        <View style={styles.profileRow}>
          <Avatar user={user} size="md" />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.profileRole} numberOfLines={1}>{user?.position || 'Member'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: '#000000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  logoChar: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  brandSub: {
    color: '#64748b',
    fontSize: 12,
  },
  navContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRightWidth: 2,
    borderRightColor: '#6366f1',
  },
  navIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    color: '#94a3b8',
  },
  navIconActive: {
    color: '#a5b4fc',
  },
  navText: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#a5b4fc',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileRole: {
    color: '#64748b',
    fontSize: 11,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
