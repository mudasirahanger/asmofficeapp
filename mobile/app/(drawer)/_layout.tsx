import React, { useEffect } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContent } from '../../components/layout/DrawerContent';

export default function DrawerLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  return (
    <Drawer
      // expo-router bundles its own copy of @react-navigation/drawer's types,
      // which TS treats as structurally distinct from the top-level
      // @react-navigation/drawer types DrawerContent's props are declared
      // against (duplicate-package type identity issue, not a real runtime
      // mismatch — both are the same DrawerNavigationHelpers shape at
      // runtime). Cast at this single boundary rather than loosening
      // DrawerContent's own prop types.
      drawerContent={(props) => <DrawerContent {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        drawerType: isDesktop ? 'permanent' : 'front',
        drawerStyle: { width: 270, backgroundColor: '#0f172a' }, // match slate-900
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="dashboard" />
      <Drawer.Screen name="analytics" />
      <Drawer.Screen name="projects" />
      <Drawer.Screen name="attendance" />
      <Drawer.Screen name="leaves" />
      <Drawer.Screen name="team" />
      <Drawer.Screen name="billing" />
      <Drawer.Screen name="notifications" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="changelog" />
      <Drawer.Screen name="documentation" />
      <Drawer.Screen name="settings" />
    </Drawer>
  );
}
