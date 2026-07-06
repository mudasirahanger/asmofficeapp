import React, { useEffect } from 'react';
import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { ToastContainer } from '../components/shared/Toast';
import { useThemeStore } from '../store/themeStore';
import { useColorScheme } from 'nativewind';
import { Appearance } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Prevent retries on 403/500 to avoid WAF blocks
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 mins
      gcTime: 1000 * 60 * 60 * 24, // Keep garbage collection time at 24 hours for persistence
      refetchOnWindowFocus: false, // CRITICAL: Stop rapid API calls when user switches tabs
      refetchOnReconnect: false,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

function AuthGuard() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === 'login';
    if (!isAuthenticated && !inAuth) {
      router.replace('/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(drawer)/dashboard');
    }
  }, [isAuthenticated, isLoading, segments]);

  useEffect(() => {
    // Register Service Worker for PWA (Web Offline Support)
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
          console.log('Service Worker registration failed: ', err);
        });
      });
    }
  }, []);

  return null;
}

export default function RootLayout() {
  const { theme } = useThemeStore();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    if (theme === 'system') {
      const colorScheme = Appearance.getColorScheme();
      setColorScheme(colorScheme || 'light');
    } else {
      setColorScheme(theme);
    }
  }, [theme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
          <AuthGuard />
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(drawer)" />
            <Stack.Screen name="bills/[id]" />
          </Stack>
          <ToastContainer />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

