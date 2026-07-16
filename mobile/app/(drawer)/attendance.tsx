import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/routers';
import { useNavigation } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import AdminAttendanceView from '../../components/attendance/AdminAttendanceView';
import MemberAttendanceView from '../../components/attendance/MemberAttendanceView';

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'mine' | 'manage'>('mine');

  const isFounder = user?.role === 'founder';
  const canManage = isFounder || ['accounts', 'hr', 'reception', 'head'].includes(user?.role || '');

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {canManage && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'mine' && styles.activeTab]} 
              onPress={() => setActiveTab('mine')}
            >
              <Text style={[styles.tabText, activeTab === 'mine' && styles.activeTabText]}>My Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'manage' && styles.activeTab]} 
              onPress={() => setActiveTab('manage')}
            >
              <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>Manage Team</Text>
            </TouchableOpacity>
          </View>
        )}

        {canManage ? (
          activeTab === 'manage' ? <AdminAttendanceView /> : <MemberAttendanceView />
        ) : (
          <MemberAttendanceView />
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  scroll: { padding: 24, maxWidth: 1200, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#0f172a',
  },
});
