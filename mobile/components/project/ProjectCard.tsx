import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Project } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { ProgressBar } from '../ui/ProgressBar';
import { STATUS_MAP, PRIORITY_MAP, DEPT_COLORS } from '../../constants';
import { formatDate, isOverdue, daysLeftLabel } from '../../utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../../services/teamService';
import { projectService } from '../../services/projectService';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useUIStore } from '../../store/uiStore';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status  = STATUS_MAP[project.status];
  const priority = PRIORITY_MAP[project.priority];
  const deptColor = project.department?.color
    ? DEPT_COLORS[project.department.color] ?? DEPT_COLORS.slate
    : DEPT_COLORS.slate;

  const overdue  = isOverdue(project.deadline, project.status);
  const dlLabel  = daysLeftLabel(project.deadline, project.status);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: teamService.getUsers,
    staleTime: 5 * 60 * 1000,
  });
  const users = usersData?.users || [];
  const extractUser = (val: any, relation: any) => relation || ((typeof val === 'object' && val !== null) ? val : users.find((u: any) => u.id === val));
  
  const assignee = extractUser(project.assigned_to, project.assignedTo);
  const subAssignee = extractUser(project.sub_assigned_to, project.subAssignedTo);
  const creator = extractUser(project.created_by, project.createdBy) || { name: 'System', id: 0 };

  const latestPct = project.progressUpdates?.[0]?.percentage ?? 0;

  const handleComplete = async () => {
    try {
      await projectService.update(project.id, { status: 'completed' });
      useUIStore.getState().addToast({ type: 'success', message: `Marked "${project.title}" as completed!` });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    } catch (e) {
      useUIStore.getState().addToast({ type: 'error', message: 'Failed to update project' });
    }
  };

  const renderLeftActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <View className="bg-emerald-500 rounded-2xl mb-3 flex-row items-center pl-6 w-full">
        <Animated.Text style={{ transform: [{ scale }] }} className="text-white font-bold text-lg">
          ✅ Complete
        </Animated.Text>
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={project.status !== 'completed' ? renderLeftActions : undefined}
      onSwipeableLeftOpen={handleComplete}
      overshootLeft={false}
    >
      <TouchableOpacity
        onPress={() => router.push(`/(drawer)/projects/${project.id}` as any)}
        activeOpacity={0.8}
        className="mb-3"
      >
        <Card className={`p-0 overflow-hidden ${overdue ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
          <View className="p-4">
            {/* Top Row: Client & Status */}
            <View className="flex-row justify-between items-center mb-2">
              {project.client ? (
                <View className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md shrink mr-2">
                  <Text className="text-xs">🏢</Text>
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink" numberOfLines={1}>{project.client}</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md shrink mr-2">
                  <Text className="text-xs">📁</Text>
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink">Internal</Text>
                </View>
              )}
              <Badge label={status?.label ?? project.status} bg={status?.bg ?? '#f1f5f9'} text={status?.text ?? '#64748b'} dot />
            </View>

            {/* Title Row */}
            <View className="flex-row items-center gap-2 mb-3">
              {project.department && (
                <View style={{ backgroundColor: deptColor.dot }} className="w-2.5 h-2.5 rounded-full" />
              )}
              <Text className="text-base font-extrabold text-slate-900 dark:text-white flex-1" numberOfLines={1}>{project.title}</Text>
            </View>

            {/* Meta Badges */}
            <View className="flex-row flex-wrap items-center gap-1.5 mb-3">
              {assignee ? (
                <Badge label={`👨‍💻 ${assignee.name}`} bg="#f8fafc" text="#475569" />
              ) : (
                <Badge label="👨‍💻 Unassigned" bg="#fef2f2" text="#dc2626" />
              )}
              {subAssignee && (
                <Badge label={`👨‍💻 Sub: ${subAssignee.name}`} bg="#f8fafc" text="#475569" />
              )}
              {project.department && (
                <View style={{ backgroundColor: deptColor.badge }} className="px-2 py-1 rounded-md">
                  <Text style={{ color: deptColor.text }} className="text-[11px] font-bold">{project.department.name}</Text>
                </View>
              )}
              <Badge label={priority?.label ?? project.priority} bg={priority?.bg ?? '#f8fafc'} text={priority?.text ?? '#64748b'} />
            </View>

            {/* Progress & Latest Update */}
            {project.status !== 'assigned' && (
              <View className="mt-1 mb-1">
                <ProgressBar value={latestPct} />
                {project.progressUpdates && project.progressUpdates.length > 0 && (
                  <View className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Latest Update</Text>
                      <Text className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(project.progressUpdates[0].progress_date || project.progressUpdates[0].created_at)}
                      </Text>
                    </View>
                    <Text className="text-[13px] text-slate-700 dark:text-slate-300 leading-tight" numberOfLines={2}>
                      {project.progressUpdates[0].text}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Footer Area */}
          <View className="flex-row justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center">
              {creator && (
                <View className="border-2 border-white dark:border-slate-900 rounded-full">
                  <Avatar user={creator} size="sm" />
                </View>
              )}
              {assignee && (
                <View className="border-2 border-white dark:border-slate-900 rounded-full -ml-2">
                  <Avatar user={assignee} size="sm" />
                </View>
              )}
              {subAssignee && (
                <View className="border-2 border-white dark:border-slate-900 rounded-full -ml-2">
                  <Avatar user={subAssignee} size="sm" />
                </View>
              )}
            </View>
            
            <View className="items-end gap-0.5">
              {project.deadline && (
                <>
                  <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">📅 Due {formatDate(project.deadline)}</Text>
                  {dlLabel && (
                    <Text className={`text-[11px] font-bold ${overdue ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {dlLabel}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Swipeable>
  );
});

