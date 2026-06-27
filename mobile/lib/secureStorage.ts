/**
 * Cross-platform secure storage.
 * - Native (iOS/Android): uses expo-secure-store
 * - Web: falls back to localStorage
 */
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (isWeb) {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(key);
  },
};
