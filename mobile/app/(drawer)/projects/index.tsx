import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, useWindowDimensions, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/routers';
import { SafeAreaView } from 'react-native-safe-area-context';
import { projectService } from '../../../services/projectService';
import { useAuthStore } from '../../../store/authStore';
import { ProjectCard } from '../../../components/project/ProjectCard';
import { LoadingState, EmptyState, ErrorState } from '../../../components/shared/States';
import { DEPARTMENTS_SEED } from '../../../constants';
import { Project } from '../../../types';

const STATUS_FILTERS = [
  { label: 'All Status',   value: 'all' },
  { label: 'Assigned',     value: 'assigned' },
  { label: 'In Progress',  value: 'in_progress' },
  { label: 'Completed',    value: 'completed' },
  { label: 'Billed',       value: 'billed' },
  { label: 'Overdue',      value: 'overdue' },
];

export default function ProjectsScreen() {
  const [status, setStatus]   = useState('all');
  const [dept, setDept]       = useState('all');
  const [search, setSearch]   = useState('');
  const { user }              = useAuthStore();
  const navigation            = useNavigation();
  const router                = useRouter();
  const { width }             = useWindowDimensions();
  const isDesktop             = width >= 768;

  const isFounder = user?.role === 'founder';
  const isHead    = user?.role === 'head';
  const canCreate = isFounder || isHead;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['projects', status, dept, search],
    queryFn:  () => projectService.list({
      status: status !== 'all' ? status : undefined,
      dept:   dept   !== 'all' ? dept   : undefined,
      search: search || undefined,
    }),
  });

  const projects: Project[] = data?.data ?? data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isDesktop && (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuBtn}>
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Projects</Text>
        </View>
        {canCreate && (
          <TouchableOpacity
            onPress={() => router.push('/(drawer)/projects/create' as any)}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>＋ New Project</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters card */}
      <View style={styles.filterCard}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects or clients..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chips}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setStatus(f.value)}
                style={[styles.chip, status === f.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, status === f.value && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Department filter — founder only */}
        {isFounder && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chips}>
              <TouchableOpacity
                onPress={() => setDept('all')}
                style={[styles.chip, styles.chipDept, dept === 'all' && styles.chipDeptActive]}
              >
                <Text style={[styles.chipText, dept === 'all' && styles.chipTextActive]}>All Depts</Text>
              </TouchableOpacity>
              {DEPARTMENTS_SEED.map((d) => (
                <TouchableOpacity
                  key={d.slug}
                  onPress={() => setDept(d.slug)}
                  style={[styles.chip, styles.chipDept, dept === d.slug && styles.chipDeptActive]}
                >
                  <Text style={[styles.chipText, dept === d.slug && styles.chipTextActive]}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Project list */}
      {isLoading ? (
        <LoadingState message="Loading projects..." />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects found" subtitle="Try changing your filters" icon="📁" />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ProjectCard project={item} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuBtn:    { padding: 4 },
  menuIcon:   { fontSize: 22, color: '#475569' },
  title:      { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  addBtn:     { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filterCard: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, backgroundColor: '#f8fafc',
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },

  chipsScroll: { flexGrow: 0 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 2 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipDept: { backgroundColor: '#f8fafc' },
  chipActive:     { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipDeptActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText:       { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },

  list: { padding: 12, paddingBottom: 40 },
});
