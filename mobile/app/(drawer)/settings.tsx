import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { settingsService } from '../../services/settingsService';
import { useThemeStore } from '../../store/themeStore';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [settings, setSettings] = useState({
    officeName: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    logoUrl: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankBranch: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Role verification (Founder or Accounts for invoice settings)
  const role = user?.role ?? 'member';
  const hasAccess = role === 'founder' || role === 'accounts' || (user?.departments && user.departments.some(d => d.name.toLowerCase().includes('web') || d.name.toLowerCase().includes('digital')));

  useEffect(() => {
    if (hasAccess) {
      fetchSettings();
    }
  }, [hasAccess]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getSettings();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await settingsService.updateSettings(settings);
      if (Platform.OS === 'web') {
        window.alert('Settings saved successfully');
      } else {
        Alert.alert('Success', 'Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to save settings');
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Removed early return for !hasAccess so all users can see Appearance settings

  const handleWhitelistIP = async () => {
    setIsUpdating(true);
    setStatusMessage('');

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://yourdomain.com/api';
      
      const response = await axios.post(`${baseUrl}/whitelist-office`, {}, {
        headers: {
          'X-Office-Secret': '3380cb31-b3d2-48ea-b74c-6a03f13bcb58'
        }
      });
      
      if (response.data && response.data.message) {
        if (Platform.OS === 'web') {
          window.alert('Success: ' + response.data.message);
        } else {
          Alert.alert('Success', response.data.message);
        }
        setStatusMessage(`IP (${response.data.ip}) Whitelisted successfully.`);
      }
    } catch (error: any) {
      console.error('Whitelist error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update IP Whitelist.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      setStatusMessage(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Appearance Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <Text style={styles.cardDesc}>Choose how the app looks on your device.</Text>
          
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            {['system', 'light', 'dark'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTheme(t as any)}
                style={[
                  { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
                  theme === t && { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }
                ]}
              >
                <Text style={{ fontWeight: '600', color: theme === t ? '#fff' : '#475569', textTransform: 'capitalize' }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {hasAccess && (
          <>
            {/* Invoice Settings Card */}
            <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.cardTitle}>Office & Invoice Settings</Text>
          <Text style={styles.cardDesc}>Configure details to appear on PDF Invoices.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Office Name</Text>
            <TextInput style={styles.input} value={settings.officeName} onChangeText={(val) => setSettings({...settings, officeName: val})} placeholder="e.g. Associated Media" />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>GSTIN</Text>
              <TextInput style={styles.input} value={settings.gstin} onChangeText={(val) => setSettings({...settings, gstin: val})} placeholder="e.g. 01AAAAA0000A1Z5" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>PAN</Text>
              <TextInput style={styles.input} value={settings.pan} onChangeText={(val) => setSettings({...settings, pan: val})} placeholder="e.g. AAAAA0000A" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.input} value={settings.phone} onChangeText={(val) => setSettings({...settings, phone: val})} placeholder="+91 XXXXXXXXXX" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={settings.email} onChangeText={(val) => setSettings({...settings, email: val})} placeholder="info@example.com" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput style={styles.input} value={settings.website} onChangeText={(val) => setSettings({...settings, website: val})} placeholder="www.example.com" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Office Address</Text>
            <TextInput style={styles.input} value={settings.address} onChangeText={(val) => setSettings({...settings, address: val})} multiline placeholder="Full Office Address" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Logo URL</Text>
            <TextInput style={styles.input} value={settings.logoUrl} onChangeText={(val) => setSettings({...settings, logoUrl: val})} placeholder="https://example.com/logo.png" />
          </View>

          <Text style={[styles.cardTitle, { marginTop: 10, fontSize: 16 }]}>Bank Details</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Account Name</Text>
              <TextInput style={styles.input} value={settings.bankAccountName} onChangeText={(val) => setSettings({...settings, bankAccountName: val})} placeholder="Account Name" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput style={styles.input} value={settings.bankAccountNumber} onChangeText={(val) => setSettings({...settings, bankAccountNumber: val})} placeholder="Account Number" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput style={styles.input} value={settings.bankIfsc} onChangeText={(val) => setSettings({...settings, bankIfsc: val})} placeholder="IFSC" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Branch</Text>
              <TextInput style={styles.input} value={settings.bankBranch} onChangeText={(val) => setSettings({...settings, bankBranch: val})} placeholder="Branch Name" />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#0ea5e9', marginTop: 10 }, isSaving && styles.buttonDisabled]} 
            onPress={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* WAF Whitelist Card */}
        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.cardTitle}>Imunify360 IP Whitelist</Text>
          <Text style={styles.cardDesc}>
            If you are working from the office and experiencing connection issues or 403 errors, 
            the office IP might have changed. Click the button below to update the WAF Whitelist.
          </Text>

          <TouchableOpacity 
            style={[styles.button, isUpdating && styles.buttonDisabled]} 
            onPress={handleWhitelistIP}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sync Office IP</Text>
            )}
          </TouchableOpacity>

          {statusMessage ? (
            <Text style={[styles.statusText, statusMessage.includes('Success') ? styles.textSuccess : styles.textError]}>
              {statusMessage}
            </Text>
          ) : null}
        </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(100, 116, 139, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#ef4444', 
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  textSuccess: {
    color: '#10b981',
  },
  textError: {
    color: '#ef4444',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
  }
});
