import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Redirect } from 'expo-router';
import { Skeleton } from '../../components/ui/Skeleton';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedBar = ({ percentage }: { percentage: number }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(percentage, { damping: 20, stiffness: 90 });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <Animated.View className="h-full bg-indigo-600 rounded-full" style={animatedStyle} />
    </View>
  );
};

export default function AnalyticsScreen() {
  const { user } = useAuthStore();
  
  if (!user || !['founder', 'hr'].includes(user.role)) {
    return <Redirect href="/(drawer)/dashboard" />;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, maxWidth: 1200, alignSelf: 'center', width: '100%' }}>
          <Skeleton width={300} height={32} borderRadius={8} style={{ marginBottom: 24 }} />
          <View className="flex-row flex-wrap gap-4 mb-6">
            {[1,2,3,4].map(i => <Skeleton key={i} width={200} height={120} borderRadius={16} style={{ flex: 1, minWidth: 200 }} />)}
          </View>
          <Skeleton width="100%" height={250} borderRadius={16} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <Text className="text-red-500 text-base">Failed to load analytics data.</Text>
      </SafeAreaView>
    );
  }

  const overview = data?.overview || {};
  const statusCounts = data?.projects_by_status || {};

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, maxWidth: 1200, alignSelf: 'center', width: '100%' }}>
        <Text className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">Analytics & Reporting</Text>
        
        <View className="flex-row flex-wrap gap-4 mb-6" style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column' }}>
          <View className="flex-1 min-w-[200px] p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 items-center justify-center shadow-sm shadow-black/5">
            <Text className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2 uppercase tracking-wider">Total Projects</Text>
            <Text className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{overview.total_projects || 0}</Text>
          </View>
          
          <View className="flex-1 min-w-[200px] p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 items-center justify-center shadow-sm shadow-black/5">
            <Text className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2 uppercase tracking-wider">Completed</Text>
            <Text className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{overview.completed_projects || 0}</Text>
          </View>
          
          <View className="flex-1 min-w-[200px] p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 items-center justify-center shadow-sm shadow-black/5">
            <Text className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2 uppercase tracking-wider">Completion Rate</Text>
            <Text className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{overview.completion_rate || 0}%</Text>
          </View>
          
          <View className="flex-1 min-w-[200px] p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 items-center justify-center shadow-sm shadow-black/5">
            <Text className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2 uppercase tracking-wider">Active Users</Text>
            <Text className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{overview.active_users_today || 0}</Text>
          </View>
        </View>

        <View className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shadow-black/5">
          <Text className="text-lg font-bold text-slate-900 dark:text-white mb-5">Projects by Status</Text>
          <View className="gap-4">
            {Object.entries(statusCounts).map(([status, count]: [string, any]) => {
              const percentage = overview.total_projects ? (count / overview.total_projects) * 100 : 0;
              return (
                <View key={status} className="flex-row items-center gap-3">
                  <Text className="w-24 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{status}</Text>
                  <AnimatedBar percentage={percentage} />
                  <Text className="w-8 text-right text-sm font-bold text-slate-900 dark:text-white">{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

