import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function DocumentationScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const DocSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <Text style={styles.pageTitle}>App Documentation</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.grid, isDesktop && styles.gridLg]}>
          <View style={styles.mainCol}>
            
            <DocSection title="1. User Roles & Permissions">
              <View style={styles.pItem}>
                <Badge label="Founder / Director" bg="#fef2f2" text="#dc2626" />
                <Text style={styles.pText}>Full access to all modules, billing, user management, and overriding deadlines.</Text>
              </View>
              <View style={styles.pItem}>
                <Badge label="Head of Department" bg="#fffbeb" text="#d97706" />
                <Text style={styles.pText}>Manage projects for their assigned department. Can sub-assign projects to members and mark projects as completed.</Text>
              </View>
              <View style={styles.pItem}>
                <Badge label="Member" bg="#eff6ff" text="#2563eb" />
                <Text style={styles.pText}>Can view assigned projects, submit daily progress updates, and mark personal attendance/leaves.</Text>
              </View>
              <View style={styles.pItem}>
                <Badge label="Accounts" bg="#fdf4ff" text="#c026d3" />
                <Text style={styles.pText}>Can view completed projects and mark them as billed. Generates billing reports.</Text>
              </View>
            </DocSection>

            <DocSection title="2. The Project Workflow">
              <View style={styles.flowBox}>
                <View style={styles.flowStep}>
                  <Text style={styles.flowNum}>1</Text>
                  <View style={styles.flowTextWrap}>
                    <Text style={styles.flowLabel}>Assigned</Text>
                    <Text style={styles.flowDesc}>Founder or Head creates a project and assigns it to a member or sub-assigns to multiple members.</Text>
                  </View>
                </View>
                <View style={styles.flowLine} />
                <View style={styles.flowStep}>
                  <Text style={styles.flowNum}>2</Text>
                  <View style={styles.flowTextWrap}>
                    <Text style={styles.flowLabel}>In Progress</Text>
                    <Text style={styles.flowDesc}>Members submit "Progress Updates" describing their work and completion percentage. The project automatically becomes "In Progress".</Text>
                  </View>
                </View>
                <View style={styles.flowLine} />
                <View style={styles.flowStep}>
                  <Text style={styles.flowNum}>3</Text>
                  <View style={styles.flowTextWrap}>
                    <Text style={styles.flowLabel}>Completed</Text>
                    <Text style={styles.flowDesc}>Founder or Head marks the project as "Completed" once the work is verified and finalized.</Text>
                  </View>
                </View>
                <View style={styles.flowLine} />
                <View style={styles.flowStep}>
                  <Text style={styles.flowNum}>4</Text>
                  <View style={styles.flowTextWrap}>
                    <Text style={styles.flowLabel}>Billed</Text>
                    <Text style={styles.flowDesc}>The Accounts department reviews the completed project and marks it as "Billed" once invoiced to the client.</Text>
                  </View>
                </View>
              </View>
            </DocSection>

            <DocSection title="3. Invoicing & Billing">
              <Text style={styles.pText}>• <Text style={styles.bold}>Ready to Bill:</Text> Projects that are marked "Completed" show up here. Accounts can mark them as Billed, which automatically generates and downloads a standard PDF invoice.</Text>
              <Text style={styles.pText}>• <Text style={styles.bold}>Billed Projects:</Text> Toggle the "Billed This Month" card to view billed projects. From here, you can view the project details or re-download the PDF invoice anytime.</Text>
              <Text style={styles.pText}>• <Text style={styles.bold}>Client List:</Text> When creating a project, the client name dropdown automatically populates with past clients for easy selection.</Text>
            </DocSection>

            <DocSection title="4. Leave & Attendance">
              <Text style={styles.pText}>• <Text style={styles.bold}>Check In/Out:</Text> Use the Dashboard to log your daily attendance. The system tracks your hours automatically.</Text>
              <Text style={styles.pText}>• <Text style={styles.bold}>Leave Requests:</Text> Members submit leaves in the "Leaves" tab. Heads or Founders must approve them before they reflect in payroll.</Text>
            </DocSection>

            <DocSection title="5. Download Desktop & Mobile Apps">
              <Text style={styles.pText}>You can install the native apps for all your devices below to get notifications and offline support:</Text>
              <View style={{ marginTop: 16, gap: 16 }}>
                <View style={styles.downloadRow}>
                  <Text style={styles.osIcon}>💻</Text>
                  <View style={styles.downloadTextWrap}>
                    <Text style={styles.osName}>Desktop</Text>
                    <View style={styles.downloadLinks}>
                      <TouchableOpacity><Text style={styles.link}>Download for Mac</Text></TouchableOpacity>
                      <Text style={styles.dot}>•</Text>
                      <TouchableOpacity><Text style={styles.link}>Download for Windows</Text></TouchableOpacity>
                      <Text style={styles.dot}>•</Text>
                      <TouchableOpacity><Text style={styles.link}>Download for Linux</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                <View style={styles.downloadRow}>
                  <Text style={styles.osIcon}>📱</Text>
                  <View style={styles.downloadTextWrap}>
                    <Text style={styles.osName}>Mobile</Text>
                    <View style={styles.downloadLinks}>
                      <TouchableOpacity><Text style={styles.link}>iOS (App Store)</Text></TouchableOpacity>
                      <Text style={styles.dot}>•</Text>
                      <TouchableOpacity><Text style={styles.link}>Android (Play Store)</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </DocSection>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  scroll: { padding: 24, paddingBottom: 60, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  grid: { flexDirection: 'column', gap: 20 },
  gridLg: { flexDirection: 'row', gap: 20 },
  mainCol: { flex: 1, gap: 20 },
  card: { padding: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  pItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  pText: { fontSize: 15, color: '#475569', lineHeight: 24, flex: 1 },
  bold: { fontWeight: '700', color: '#334155' },
  flowBox: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  flowStep: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  flowNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4f46e5', color: '#fff', textAlign: 'center', lineHeight: 32, fontWeight: '700', fontSize: 14 },
  flowTextWrap: { flex: 1, marginTop: 4 },
  flowLabel: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 4 },
  flowDesc: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  flowLine: { width: 2, height: 24, backgroundColor: '#cbd5e1', marginLeft: 15, marginVertical: 4 },
  downloadRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  osIcon: { fontSize: 24 },
  downloadTextWrap: { flex: 1, gap: 4 },
  osName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  downloadLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  link: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  dot: { color: '#94a3b8', fontSize: 12 },
});
