import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/routers';

function ScreenBase({ title, icon, children }: { title: string; icon: string; children?: React.ReactNode }) {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        {children ?? (
          <>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.label}>{title}</Text>
            <Text style={styles.sub}>Coming soon</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f1f5f9' },
  header:  {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  menuBtn:  { padding: 4 },
  menuIcon: { fontSize: 20, color: '#475569' },
  title:    { flex: 1, fontSize: 17, fontWeight: '700', color: '#1e293b' },
  body:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  icon:     { fontSize: 48 },
  label:    { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  sub:      { fontSize: 14, color: '#94a3b8' },
});

export { ScreenBase };
