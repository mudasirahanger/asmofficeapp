import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Project } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { ProgressBar } from '../ui/ProgressBar';
import { STATUS_MAP, PRIORITY_MAP, DEPT_COLORS, COLORS } from '../../constants';
import { formatDate, isOverdue, daysLeftLabel } from '../../utils';
import { useQuery } from '@tanstack/react-query';
import { teamService } from '../../services/teamService';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project }) => {
  const router = useRouter();
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

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(drawer)/projects/${project.id}` as any)}
      activeOpacity={0.85}
    >
      <Card style={[styles.card, overdue && styles.overdue] as any}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {project.department && (
              <View style={[styles.deptDot, { backgroundColor: deptColor.dot }]} />
            )}
            <Text style={styles.title} numberOfLines={1}>{project.title}</Text>
          </View>
          <Badge label={status?.label ?? project.status} bg={status?.bg ?? '#f1f5f9'} text={status?.text ?? '#64748b'} dot />
        </View>

        {/* Client & Priority */}
        <View style={styles.metaRow}>
          {project.client && (
            <Text style={styles.meta}>👤 {project.client}</Text>
          )}
          {assignee ? (
            <Badge label={`👨‍💻 ${assignee.name}`} bg="#f1f5f9" text="#475569" />
          ) : (
            <Badge label="👨‍💻 Unassigned" bg="#fef2f2" text="#dc2626" />
          )}
          {subAssignee && (
            <Badge label={`👨‍💻 Sub: ${subAssignee.name}`} bg="#f1f5f9" text="#475569" />
          )}
          {project.department && (
            <View style={[styles.deptBadge, { backgroundColor: deptColor.badge }]}>
              <Text style={[styles.deptText, { color: deptColor.text }]}>{project.department.name}</Text>
            </View>
          )}
          <Badge label={priority?.label ?? project.priority} bg={priority?.bg ?? '#f1f5f9'} text={priority?.text ?? '#64748b'} />
        </View>

        {/* Progress & Timeline */}
        {project.status !== 'assigned' && (
          <View style={styles.progressArea}>
            <ProgressBar value={latestPct} />
            {project.progressUpdates && project.progressUpdates.length > 0 && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>
                    Latest Update
                  </Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                    {formatDate(project.progressUpdates[0].progress_date || project.progressUpdates[0].created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={2}>
                  {project.progressUpdates[0].text}
                </Text>
                {project.progressUpdates[0].user && (
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    By {project.progressUpdates[0].user.name}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.assigneeRow, { flexWrap: 'wrap', gap: 8, flex: 1 }]}>
            {creator && (
              <View style={styles.assignee}>
                <Avatar user={creator} size="sm" />
                <Text style={styles.assigneeName}>By: {creator.name}</Text>
              </View>
            )}
            {assignee && (
              <View style={styles.assignee}>
                <Avatar user={assignee} size="sm" />
                <Text style={styles.assigneeName}>To: {assignee.name}</Text>
              </View>
            )}
            {subAssignee && (
              <View style={styles.assignee}>
                <Avatar user={subAssignee} size="sm" />
                <Text style={styles.assigneeName}>Sub: {subAssignee.name}</Text>
              </View>
            )}
          </View>
          <View style={styles.dateGroup}>
            {project.deadline && (
              <>
                <Text style={styles.dateLabel}>📅 Due Date: {formatDate(project.deadline)}</Text>
                {dlLabel && (
                  <Text style={[styles.dlLabel, overdue && styles.overdueLabel]}>
                    {dlLabel}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card:        { marginBottom: 10 },
  overdue:     { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  deptDot:     { width: 8, height: 8, borderRadius: 4 },
  title:       { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  meta:        { fontSize: 12, color: '#64748b' },
  deptBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  deptText:    { fontSize: 10, fontWeight: '600' },
  progressArea:{ marginBottom: 10 },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assigneeRow: { flexDirection: 'row', alignItems: 'center' },
  assignee:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeName:{ fontSize: 12, color: '#64748b' },
  dateGroup:   { alignItems: 'flex-end', gap: 2 },
  dateLabel:   { fontSize: 11, color: '#94a3b8' },
  dlLabel:     { fontSize: 11, color: '#6366f1', fontWeight: '600' },
  overdueLabel:{ color: '#dc2626' },
});
