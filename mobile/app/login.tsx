import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { FontAwesome5 } from '@expo/vector-icons';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const { login }     = useAuthStore();
  const { showToast } = useUIStore();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showToast('Please enter username and password', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password.trim());
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.errors?.username?.[0]
        ?? 'Invalid username or password';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.contentWrapper}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>AM</Text>
          </View>
          <Text style={styles.appName}>Office Hub</Text>
          <Text style={styles.appTagline}>Sign in to your workspace</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>Sign In →</Text>
            }
          </TouchableOpacity>

          {/* Bottom Section: DEV ONLY or Store Badges */}
          {process.env.NODE_ENV !== 'production' ? (
            <View style={styles.quickLoginDivider}>
              <Text style={styles.quickLoginTitle}>Quick login</Text>
              <View style={styles.quickLoginGrid}>
                {['tariq', 'wajahat', 'sameer', 'bisma', 'tabish', 'zafar', 'faisul', 'bilquees'].map((n) => (
                  <TouchableOpacity 
                    key={n} 
                    style={styles.quickLoginBtn}
                    onPress={() => { setUsername(n); setPassword(n + '123'); }}
                  >
                    <Text style={styles.quickLoginBtnText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.quickLoginHint}>Password = username + 123</Text>
            </View>
          ) : (
            <View style={styles.storeBadgesContainer}>
              <Text style={styles.storeBadgesTitle}>Get the mobile app</Text>
              <View style={styles.storeBadgesRow}>
                <TouchableOpacity style={styles.storeBadge} onPress={() => {}} activeOpacity={0.8}>
                  <FontAwesome5 name="apple" size={24} color="#fff" />
                  <View style={styles.storeBadgeTextWrap}>
                    <Text style={styles.storeBadgeSub}>Download on the</Text>
                    <Text style={styles.storeBadgeMain}>App Store</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.storeBadge} onPress={() => {}} activeOpacity={0.8}>
                  <FontAwesome5 name="google-play" size={20} color="#fff" />
                  <View style={styles.storeBadgeTextWrap}>
                    <Text style={styles.storeBadgeSub}>GET IT ON</Text>
                    <Text style={styles.storeBadgeMain}>Google Play</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, // bg-slate-900 to simulate gradient base
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
  contentWrapper: { width: '100%', maxWidth: 448, alignSelf: 'center' }, // max-w-md

  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64,
    backgroundColor: '#000000',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 8px 16px rgba(239, 68, 68, 0.3)',
    elevation: 10,
    marginBottom: 16,
  },
  logoLetter: { color: '#ef4444', fontSize: 26, fontWeight: '800' },
  appName:    { fontSize: 30, fontWeight: '800', color: '#ffffff' },
  appTagline: { fontSize: 14, color: '#94a3b8', marginTop: 4 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16, // rounded-2xl
    padding: 32, // p-8
    boxShadow: '0px 4px 16px rgba(0,0,0,0.1)',
    elevation: 4,
    gap: 16,
  },

  fieldGroup: { gap: 4 },
  label: {
    fontSize: 12, fontWeight: '600',
    color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:     { padding: 8 },
  eyeIcon:    { fontSize: 18 },

  loginBtn: {
    backgroundColor: '#4f46e5', // bg-indigo-600
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  quickLoginDivider: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickLoginTitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
  },
  quickLoginGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  quickLoginBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: '22%',
    alignItems: 'center',
  },
  quickLoginBtnText: {
    textTransform: 'capitalize',
    fontSize: 12,
    color: '#475569',
  },
  quickLoginHint: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 12,
  },

  // "Get the mobile app" store badges (previously referenced but never
  // defined here — every element rendered with no styling at all; see
  // PRODUCTION_AUDIT.md).
  storeBadgesContainer: { alignItems: 'center', marginTop: 8 },
  storeBadgesTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  storeBadgesRow: { flexDirection: 'row', gap: 10 },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  storeBadgeTextWrap: { flexDirection: 'column' },
  storeBadgeSub: { color: '#cbd5e1', fontSize: 9, lineHeight: 11 },
  storeBadgeMain: { color: '#ffffff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
});
