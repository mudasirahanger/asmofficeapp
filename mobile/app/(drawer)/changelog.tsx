import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/routers';
import { useNavigation } from 'expo-router';
import { Card } from '../../components/ui/Card';

const CHANGELOG = [
  {
    version: '1.1.9',
    date: '2026-07-06',
    title: 'UI Enhancements & Dark Mode',
    releaseUrl: 'https://github.com/mudasirahanger/asmofficeapp/releases/tag/v1.1.9',
    changes: [
      'Refactored Project Cards for a cleaner, modern look.',
      'Implemented system-aware Dark Mode across major screens.',
      'Added swipe-to-complete actions for Project Cards.',
      'Added smooth animations for Toast notifications and Charts.'
    ]
  },
  {
    version: '1.1.8',
    date: '2026-07-01',
    title: 'Minor Updates',
    changes: [
      'Minor bug fixes and UI improvements.'
    ]
  },
  {
    version: '1.1.7',
    date: '2026-06-23',
    title: 'Desktop App & Settings Access',
    changes: [
      'Released the official Office Hub desktop application for macOS, Windows, and Linux.',
      'Restricted the Settings area to be only visible to HR and Founders.',
      'Updated "Client" labels to "Client Name" globally for clearer project creation.'
    ]
  },
  {
    version: '1.1.6',
    date: '2026-06-20',
    title: 'Billing Invoices & Project Timelines',
    changes: [
      'Added PDF invoice generation for billed projects.',
      'Added "Mark Billed" feature that automatically creates and downloads a PDF invoice.',
      'Updated the "Create Project" form to include a dropdown list of existing clients.',
      'Improved project cards to display recent timeline progress updates directly on the card.'
    ]
  },
  {
    version: '1.1.5',
    date: '2026-06-19',
    title: 'UI Enhancements & Layout Fixes',
    changes: [
      'Refined the top navigation bar styles for a cleaner aesthetic.',
      'Adjusted drawer menu styling and badge layouts for unread notifications.',
      'Fixed minor alignment issues in the Dashboard widgets.'
    ]
  },
  {
    version: '1.1.4',
    date: '2026-06-18',
    title: 'Authentication Stability',
    changes: [
      'Improved token refresh logic to prevent unexpected logouts.',
      'Added smoother transitions on the login and signup screens.',
      'Enhanced error messaging during network failures on login.'
    ]
  },
  {
    version: '1.1.3',
    date: '2026-06-17',
    title: 'Notification System Overhaul',
    changes: [
      'Introduced real-time notification polling improvements.',
      'Added support for unread notification count badges on the app icon and drawer.',
      'Fixed an issue where "Mark all as read" was not clearing the badge instantly.'
    ]
  },
  {
    version: '1.1.2',
    date: '2026-06-16',
    title: 'Mobile Responsiveness',
    changes: [
      'Optimized the table views on the Team and Billing screens for smaller mobile screens.',
      'Implemented scrollable rows for data-heavy sections like Department Overview.',
      'Fixed typography scaling on iOS devices.'
    ]
  },
  {
    version: '1.1.1',
    date: '2026-06-15',
    title: 'Performance & Progress Updates',
    changes: [
      'Turned on performance optimizations by running the Expo app in production mode (--no-dev).',
      'Fixed a bug where department members could not view or add progress updates to their department projects.',
      'Updated the Laravel backend to correctly allow department members to view their department projects and make progress updates.'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-06-05',
    title: 'Attendance, Leaves & Billing Enhancements',
    changes: [
      'Added this Changelog screen to showcase versioning and recent updates.',
      'Fixed a bug where "Manage Team" attendance check-in/out times were incorrectly showing as blank or not marked.',
      'Granted HR and Reception roles the ability to manage team attendance.',
      'Granted HR, Accounts, and Reception roles the ability to view, approve, reject, and cancel team leaves.',
      'Added a "Cancel" action for Pending and Approved leaves.',
      'Ensured Leave Notifications are properly broadcast to HR, Accounts, and Reception staff.',
      'Fixed the Billing Dashboard to properly display Unbilled Projects, Billed This Month, and Active Departments stats.'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-06-04',
    title: 'Initial Release',
    changes: [
      'Initial release of the Office Hub Management System.',
      'Included core modules: Dashboard, Projects, Attendance, Leaves, Team, Billing, and Notifications.',
      'Cross-platform support for web and mobile.',
    ]
  }
];

export default function ChangelogScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Changelog</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>What's New</Text>
        <Text style={styles.pageSub}>Stay up to date with the latest features, fixes, and improvements.</Text>

        <View style={styles.timeline}>
          {CHANGELOG.map((log, idx) => (
            <View key={log.version} style={styles.logEntry}>
              <View style={styles.logHeader}>
                <TouchableOpacity 
                  activeOpacity={log.releaseUrl ? 0.7 : 1}
                  onPress={() => log.releaseUrl && Linking.openURL(log.releaseUrl)}
                  style={styles.versionBadge}
                >
                  <Text style={styles.versionTxt}>v{log.version}</Text>
                </TouchableOpacity>
                <Text style={styles.dateTxt}>{log.date}</Text>
                {log.releaseUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(log.releaseUrl)}>
                    <Text style={styles.releaseLinkTxt}>View Release 🔗</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Card style={styles.card}>
                <Text style={styles.logTitle}>{log.title}</Text>
                <View style={styles.changeList}>
                  {log.changes.map((change, cIdx) => (
                    <View key={cIdx} style={styles.changeItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.changeText}>{change}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          ))}
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
  scroll: { padding: 24, maxWidth: 800, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  pageSub: { fontSize: 15, color: '#64748b', marginBottom: 32 },
  timeline: { gap: 24 },
  logEntry: { gap: 12 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  versionBadge: { backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  versionTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dateTxt: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  releaseLinkTxt: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginLeft: 'auto' },
  card: { padding: 20 },
  logTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  changeList: { gap: 12 },
  changeItem: { flexDirection: 'row', alignItems: 'flex-start' },
  bullet: { fontSize: 16, color: '#94a3b8', marginRight: 12, marginTop: -2 },
  changeText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 22 },
});
