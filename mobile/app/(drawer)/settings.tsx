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
      <View className="p-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <Text className="text-xl font-bold text-slate-900 dark:text-white">System Settings</Text>
      </View>

      <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Appearance Settings Card */}
        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm">
          <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Appearance</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-5">Choose how the app looks on your device.</Text>
          
          <View className="flex-row gap-2.5 mt-2.5">
            {['system', 'light', 'dark'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTheme(t as any)}
                style={[
                  { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
                  theme === t && { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }
                ]}
                className="dark:border-slate-600"
              >
                <Text style={{ fontWeight: '600', color: theme === t ? '#fff' : (theme === 'dark' ? '#94a3b8' : '#475569'), textTransform: 'capitalize' }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {hasAccess && (
          <>
            {/* Invoice Settings Card */}
            <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mt-5">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Office & Invoice Settings</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400 mb-5">Configure details to appear on PDF Invoices.</Text>

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Office Name</Text>
                <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.officeName} onChangeText={(val) => setSettings({...settings, officeName: val})} placeholder="e.g. Associated Media" />
              </View>
              
              <View className="flex-row justify-between flex-wrap gap-y-4">
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">GSTIN</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.gstin} onChangeText={(val) => setSettings({...settings, gstin: val})} placeholder="e.g. 01AAAAA0000A1Z5" />
                </View>
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">PAN</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.pan} onChangeText={(val) => setSettings({...settings, pan: val})} placeholder="e.g. AAAAA0000A" />
                </View>
              </View>

              <View className="flex-row justify-between flex-wrap gap-y-4">
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Phone Number</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.phone} onChangeText={(val) => setSettings({...settings, phone: val})} placeholder="+91 XXXXXXXXXX" />
                </View>
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Email</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.email} onChangeText={(val) => setSettings({...settings, email: val})} placeholder="info@example.com" />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Website</Text>
                <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.website} onChangeText={(val) => setSettings({...settings, website: val})} placeholder="www.example.com" />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Office Address</Text>
                <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.address} onChangeText={(val) => setSettings({...settings, address: val})} multiline placeholder="Full Office Address" />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Logo URL</Text>
                <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.logoUrl} onChangeText={(val) => setSettings({...settings, logoUrl: val})} placeholder="https://example.com/logo.png" />
              </View>

              <Text className="text-base font-semibold text-slate-900 dark:text-white mt-2.5 mb-2">Bank Details</Text>
              <View className="flex-row justify-between flex-wrap gap-y-4">
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Account Name</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.bankAccountName} onChangeText={(val) => setSettings({...settings, bankAccountName: val})} placeholder="Account Name" />
                </View>
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Account Number</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.bankAccountNumber} onChangeText={(val) => setSettings({...settings, bankAccountNumber: val})} placeholder="Account Number" />
                </View>
              </View>
              <View className="flex-row justify-between flex-wrap gap-y-4">
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">IFSC Code</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.bankIfsc} onChangeText={(val) => setSettings({...settings, bankIfsc: val})} placeholder="IFSC" />
                </View>
                <View className="mb-4 w-[48%]">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Branch</Text>
                  <TextInput className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700" placeholderTextColor="#94a3b8" value={settings.bankBranch} onChangeText={(val) => setSettings({...settings, bankBranch: val})} placeholder="Branch Name" />
                </View>
              </View>

              <TouchableOpacity 
                className={`bg-sky-500 mt-2.5 py-3 px-6 rounded-lg items-center justify-center ${isSaving ? 'opacity-70' : ''}`}
                onPress={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-semibold">Save Settings</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* WAF Whitelist Card */}
            <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mt-5">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Imunify360 IP Whitelist</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400 leading-5 mb-5">
                If you are working from the office and experiencing connection issues or 403 errors, 
                the office IP might have changed. Click the button below to update the WAF Whitelist.
              </Text>

              <TouchableOpacity 
                className={`bg-red-500 py-3 px-6 rounded-lg items-center justify-center ${isUpdating ? 'opacity-70' : ''}`}
                onPress={handleWhitelistIP}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-semibold">Sync Office IP</Text>
                )}
              </TouchableOpacity>

              {statusMessage ? (
                <Text className={`mt-4 text-sm font-medium text-center ${statusMessage.includes('Success') ? 'text-emerald-500' : 'text-red-500'}`}>
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

