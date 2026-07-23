import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, useWindowDimensions, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/routers';
import { SafeAreaView } from 'react-native-safe-area-context';
import { projectService } from '../../../services/projectService';
import { useAuthStore } from '../../../store/authStore';
import { ProjectCard } from '../../../components/project/ProjectCard';
import { SkeletonProjectCard } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/shared/States';
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
  // Populated when arriving from the Clients screen (tapping a client jumps
  // here pre-filtered to that client's projects, via the same title/client
  // `search` the backend already supports).
  const params = useLocalSearchParams<{ client?: string }>();
  const [status, setStatus]   = useState('all');
  const [dept, setDept]       = useState('all');
  const [search, setSearch]   = useState(params.client ?? '');
  const { user }              = useAuthStore();
  const navigation            = useNavigation();
  const router                = useRouter();
  const { width }             = useWindowDimensions();
  const isDesktop             = width >= 768;

  React.useEffect(() => {
    if (params.client) {
      setSearch(params.client);
    }
  }, [params.client]);

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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center gap-4 flex-1">
          {!isDesktop && (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} className="p-1">
              <Text className="text-2xl text-slate-700 dark:text-slate-300">☰</Text>
            </TouchableOpacity>
          )}
          <Text className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight">Projects</Text>
        </View>
        {canCreate && (
          <TouchableOpacity
            onPress={() => router.push('/(drawer)/projects/create' as any)}
            className="bg-indigo-600 rounded-xl px-4 py-2.5 shadow-md shadow-indigo-500/20"
          >
            <Text className="text-white text-sm font-bold tracking-wide">＋ New Project</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters card */}
      <View className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 py-4 z-10 shadow-sm shadow-black/5">
        {/* Search */}
        <View className="flex-row items-center gap-2.5 mx-5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 mb-3">
          <Text className="text-base dark:text-slate-400">🔍</Text>
          <TextInput
            className="flex-1 text-[15px] text-slate-900 dark:text-slate-100 font-medium"
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
          <View className="flex-row gap-2 px-5 pb-1">
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setStatus(f.value)}
                className={`px-3.5 py-2 rounded-full border ${status === f.value ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
              >
                <Text className={`text-[13px] font-semibold ${status === f.value ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Department filter — founder only */}
        {isFounder && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0 mt-3">
            <View className="flex-row gap-2 px-5 pb-1">
              <TouchableOpacity
                onPress={() => setDept('all')}
                className={`px-3.5 py-2 rounded-full border ${dept === 'all' ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
              >
                <Text className={`text-[13px] font-semibold ${dept === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>All Depts</Text>
              </TouchableOpacity>
              {DEPARTMENTS_SEED.map((d) => (
                <TouchableOpacity
                  key={d.slug}
                  onPress={() => setDept(d.slug)}
                  className={`px-3.5 py-2 rounded-full border ${dept === d.slug ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                >
                  <Text className={`text-[13px] font-semibold ${dept === d.slug ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Project list */}
      {isLoading ? (
        <ScrollView className="p-4">
          <SkeletonProjectCard />
          <SkeletonProjectCard />
          <SkeletonProjectCard />
        </ScrollView>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects found" subtitle="Try changing your filters" icon="📁" />
      ) : (
        <FlatList
          testID="projects-list"
          data={projects}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => <ProjectCard project={item} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
