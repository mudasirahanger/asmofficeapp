import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export function AppUpdater() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'>('idle');
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsElectron(true);
      const api = (window as any).electronAPI;

      api.onUpdateAvailable(() => setStatus('available'));
      api.onUpdateDownloaded(() => setStatus('ready'));
      api.onUpdateError((err: string) => {
        setStatus('error');
        console.error('Update Error:', err);
      });
    }
  }, []);

  if (!isElectron) return null;

  const handleAction = () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    if (status === 'idle' || status === 'error') {
      setStatus('checking');
      api.checkForUpdates();
      // Reset to idle if checking takes too long or fails silently (basic timeout)
      setTimeout(() => {
        setStatus(s => s === 'checking' ? 'idle' : s);
      }, 10000);
    } else if (status === 'available') {
      setStatus('downloading');
      api.downloadUpdate();
    } else if (status === 'ready') {
      api.installUpdate();
    }
  };

  let buttonText = 'Check for Upgrade';
  let buttonColor = '#6366f1';
  let showSpinner = false;

  switch (status) {
    case 'checking':
      buttonText = 'Checking...';
      showSpinner = true;
      buttonColor = '#94a3b8';
      break;
    case 'available':
      buttonText = 'Download Update';
      buttonColor = '#f59e0b';
      break;
    case 'downloading':
      buttonText = 'Downloading...';
      showSpinner = true;
      buttonColor = '#94a3b8';
      break;
    case 'ready':
      buttonText = 'Install & Restart';
      buttonColor = '#10b981';
      break;
    case 'error':
      buttonText = 'Update Error (Retry)';
      buttonColor = '#ef4444';
      break;
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: buttonColor }]}
      onPress={handleAction}
      disabled={status === 'checking' || status === 'downloading'}
    >
      {showSpinner && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />}
      <Text style={styles.text}>{buttonText}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  }
});
