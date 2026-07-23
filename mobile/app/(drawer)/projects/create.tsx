import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Platform, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../../services/projectService';
import { teamService } from '../../../services/teamService';
import { useAuthStore } from '../../../store/authStore';
import { Card } from '../../../components/ui/Card';
import DateTimePicker from '@react-native-community/datetimepicker';
import WebDatePicker from '../../../components/ui/WebDatePicker';

export default function CreateProjectScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [form, setForm] = useState({
    title: '',
    client: '',
    department_id: '',
    assigned_to: '',
    priority: 'medium',
    deadline: '',
    description: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptError, setDeptError] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Fetch lists for dropdowns
  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: teamService.getDepartments });
  const { data: userData } = useQuery({ queryKey: ['users'], queryFn: teamService.getUsers });
  const { data: projectData } = useQuery({ queryKey: ['projects'], queryFn: () => projectService.list() });

  const depts = deptData?.departments || [];
  const users = userData?.users || [];
  
  const allClients = (projectData?.projects || []).map((p: any) => p.client).filter((c: string) => !!c);
  const uniqueClients = Array.from(new Set(allClients)) as string[];

  const isFounder = user?.role === 'founder';
  const availableDepts = isFounder ? depts : depts.filter((d: any) => user?.departments?.some((ud: any) => ud.id === d.id));
  const deptMembers = users.filter((u: any) => 
    form.department_id && u.departments?.some((d: any) => d.id.toString() === form.department_id.toString()) && u.id !== user?.id
  );

  const mutation = useMutation({
    mutationFn: projectService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace('/(drawer)/projects');
    },
    onError: (err: any) => {
      setGlobalError(err.response?.data?.message || 'Failed to create project');
    }
  });

  const createDeptMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await teamService.createDepartment({ name, color: 'blue' });
      return res;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeptModal(false);
      setNewDeptName('');
      setDeptError('');
      if (res?.department?.id) {
        setForm(f => ({ ...f, department_id: res.department.id.toString(), assigned_to: '' }));
      }
    },
    onError: (err: any) => setDeptError(err.message || 'Failed to create department')
  });

  const handleCreateDept = () => {
    if (!newDeptName.trim()) {
      setDeptError('Name is required');
      return;
    }
    createDeptMutation.mutate(newDeptName.trim());
  };

  const validate = () => {
    let isValid = true;
    let newErrors: Record<string, string> = {};

    if (!form.title.trim()) { newErrors.title = 'Project Title is required'; isValid = false; }
    if (!form.department_id) { newErrors.department_id = 'Department is required'; isValid = false; }
    if (!form.deadline) { newErrors.deadline = 'Deadline is required'; isValid = false; }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    setGlobalError('');
    if (!validate()) return;

    mutation.mutate({
      ...form,
      priority: form.priority as any,
      department_id: Number(form.department_id),
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
    });
  };

  const renderSelect = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { label: string; value: string }[],
    required: boolean = false,
    error?: string
  ) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label} {required && '*'}</Text>
        {Platform.OS === 'web' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{...webSelectStyle, borderColor: error ? '#ef4444' : '#e2e8f0'} as any}
          >
            <option value="">— Select {label.replace(/ \(.*/,'').replace(' *','')} —</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <View>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder={`Type ID for ${label}...`}
              placeholderTextColor="#94a3b8"
              value={value}
              onChangeText={onChange}
            />
            <Text style={{fontSize: 10, color: '#64748b', marginTop: 4}}>Options: {options.map(o => `${o.value}=${o.label}`).join(', ')}</Text>
          </View>
        )}
        {error && <Text style={styles.errorInline}>{error}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(drawer)/projects')} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Project</Text>
        </View>

        <Card style={styles.card}>
          {globalError ? <Text style={styles.errorText}>{globalError}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g. Brand Campaign for XYZ"
              placeholderTextColor="#94a3b8"
              value={form.title}
              onChangeText={(val) => setForm({ ...form, title: val })}
            />
            {errors.title && <Text style={styles.errorInline}>{errors.title}</Text>}
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <View>
                {renderSelect(
                  'Client Name',
                  form.client === 'new' || !uniqueClients.includes(form.client) && form.client !== '' ? 'new' : form.client,
                  (val) => {
                    if (val === 'new') {
                      setForm({ ...form, client: '' });
                    } else {
                      setForm({ ...form, client: val });
                    }
                  },
                  [...uniqueClients.map(c => ({ label: c, value: c })), { label: '+ Add New Client Name', value: 'new' }]
                )}
                {(form.client === 'new' || (!uniqueClients.includes(form.client) && form.client !== '')) && (
                  <TextInput
                    style={[styles.input, { marginTop: -8, marginBottom: 16 }]}
                    placeholder="Enter new client name"
                    placeholderTextColor="#94a3b8"
                    value={form.client}
                    onChangeText={(val) => setForm({ ...form, client: val })}
                  />
                )}
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Deadline *</Text>
                {Platform.OS === 'web' ? (
                  <WebDatePicker 
                    value={form.deadline} 
                    onChange={(val: string) => setForm({...form, deadline: val})} 
                    style={{...webSelectStyle, borderColor: errors.deadline ? '#ef4444' : '#e2e8f0'}}
                  />
                ) : Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={form.deadline ? new Date(form.deadline) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        const localISOTime = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                        setForm({ ...form, deadline: localISOTime });
                      }
                    }}
                    style={{ alignSelf: 'flex-start' }}
                  />
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, { justifyContent: 'center' }, errors.deadline && styles.inputError]}>
                      <Text style={{ color: form.deadline ? '#1e293b' : '#94a3b8' }}>{form.deadline || 'YYYY-MM-DD'}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={form.deadline ? new Date(form.deadline) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (event.type === 'set' && selectedDate) {
                            const localISOTime = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                            setForm({ ...form, deadline: localISOTime });
                          }
                        }}
                      />
                    )}
                  </>
                )}
                {errors.deadline && <Text style={styles.errorInline}>{errors.deadline}</Text>}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Project brief, scope, and goals..."
              placeholderTextColor="#94a3b8"
              value={form.description}
              onChangeText={(val) => setForm({ ...form, description: val })}
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              {renderSelect(
                'Department',
                form.department_id,
                (val) => {
                  if (val === 'new') {
                    setDeptModal(true);
                  } else {
                    setForm({ ...form, department_id: val, assigned_to: '' });
                  }
                },
                [...availableDepts.map((d: any) => ({ label: d.name, value: d.id.toString() })), { label: '+ Create New Department', value: 'new' }],
                true,
                errors.department_id
              )}
            </View>
            <View style={styles.col}>
              {renderSelect(
                'Priority',
                form.priority,
                (val) => setForm({ ...form, priority: val as any }),
                [
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' }
                ]
              )}
            </View>
          </View>


            <View style={styles.col}>
              {renderSelect(
                'Assign To (optional)',
                form.assigned_to,
                (val) => setForm({ ...form, assigned_to: val }),
                [{ label: 'Department Head / General', value: '' }, ...(form.department_id ? deptMembers : users).map((u: any) => ({ label: `${u.name} — ${u.position || 'Member'}`, value: u.id.toString() }))]
              )}
            </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>Internal Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Private notes visible to management..."
              placeholderTextColor="#94a3b8"
              value={form.notes}
              onChangeText={(val) => setForm({ ...form, notes: val })}
              multiline
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Project</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/(drawer)/projects')}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {/* New Dept Modal */}
      <Modal visible={deptModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.headerTitle}>New Department</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department Name *</Text>
              <TextInput 
                style={[styles.input, deptError ? styles.inputError : null]} 
                value={newDeptName} 
                onChangeText={setNewDeptName} 
                placeholder="e.g. Marketing"
                placeholderTextColor="#94a3b8"
              />
              {deptError ? <Text style={styles.errorInline}>{deptError}</Text> : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1, height: 44, marginTop: 0 }]} onPress={handleCreateDept} disabled={createDeptMutation.isPending}>
                {createDeptMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' }]} onPress={() => setDeptModal(false)}>
                <Text style={{ color: '#475569', fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const webSelectStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  fontFamily: 'inherit',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  container: { flex: 1, padding: 24, alignSelf: 'center', width: '100%', maxWidth: 672 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({ web: { boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } })
  },
  backIcon: { fontSize: 20, color: '#64748b' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  card: { 
    padding: 24, 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#f1f5f9' 
  },
  row: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    marginBottom: 16,
  },
  col: { flex: 1 },
  inputGroup: { marginBottom: 16 },
  label: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#475569', 
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  inputError: { borderColor: '#ef4444' },
  errorInline: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { color: '#ef4444', marginBottom: 16, fontSize: 14, padding: 12, backgroundColor: '#fef2f2', borderRadius: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  submitBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#475569', fontSize: 14, fontWeight: '600' },
});
