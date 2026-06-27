import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services/projectService';
import { settingsService } from '../../services/settingsService';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import { LoadingState, ErrorState } from '../../components/shared/States';
import { useAuthStore } from '../../store/authStore';

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const projectId = parseInt(id as string, 10);

  const { data, isLoading: loadProject, isError, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId),
    enabled: !isNaN(projectId),
  });

  const { data: settingsData, isLoading: loadSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings(),
  });

  const [invoiceData, setInvoiceData] = useState({
    billToName: '',
    billToAddress: '',
    invoiceDate: new Date().toLocaleDateString('en-IN'),
    items: [
      { id: Date.now(), description: '', hsn: '', qty: 1, rate: 0, gstPercent: 18 }
    ]
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data?.project) {
      let savedData = null;
      try {
        savedData = typeof data.project.invoice_data === 'string' 
          ? JSON.parse(data.project.invoice_data) 
          : data.project.invoice_data;
      } catch (e) {}

      if (savedData && typeof savedData === 'object') {
        setInvoiceData({
          billToName: savedData.billToName || data.project.client || '',
          billToAddress: savedData.billToAddress || '',
          invoiceDate: savedData.invoiceDate || new Date().toLocaleDateString('en-IN'),
          items: Array.isArray(savedData.items) && savedData.items.length > 0
            ? savedData.items 
            : [{ id: Date.now(), description: data.project.title || '', hsn: '', qty: 1, rate: 0, gstPercent: 18 }]
        });
      } else {
        setInvoiceData(prev => ({
          ...prev,
          billToName: data.project.client || '',
          items: [{ ...prev.items[0], description: data.project.title || '' }]
        }));
      }
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => projectService.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-dash'] });
      if (Platform.OS === 'web') {
        window.alert('Invoice saved successfully');
      } else {
        Alert.alert('Success', 'Invoice saved successfully');
      }
    },
    onError: () => {
      if (Platform.OS === 'web') {
        window.alert('Failed to save invoice');
      } else {
        Alert.alert('Error', 'Failed to save invoice');
      }
    }
  });

  const markBilledMutation = useMutation({
    mutationFn: () => projectService.markBilled(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-dash'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      if (Platform.OS === 'web') {
        window.alert('Project marked as billed');
      } else {
        Alert.alert('Success', 'Project marked as billed');
      }
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updateMutation.mutateAsync({ invoice_data: invoiceData });
    setIsSaving(false);
  };

  const handleGeneratePDF = async () => {
    if (data?.project) {
      await generateInvoicePDF(data.project, invoiceData, settingsData);
    }
  };

  const handleMarkBilled = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Mark this project as Billed?')) {
        markBilledMutation.mutate();
      }
    } else {
      Alert.alert('Confirm', 'Mark this project as Billed?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => markBilledMutation.mutate() }
      ]);
    }
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), description: '', hsn: '', qty: 1, rate: 0, gstPercent: 18 }]
    }));
  };

  const removeItem = (idToRemove: number) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== idToRemove)
    }));
  };

  const updateItem = (itemId: number, field: string, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
    }));
  };

  if (loadProject || loadSettings) return <LoadingState message="Loading invoice details..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const project = data?.project;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice: {project?.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill To Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Name</Text>
            <TextInput 
              style={styles.input} 
              value={invoiceData.billToName} 
              onChangeText={(v) => setInvoiceData({...invoiceData, billToName: v})} 
              placeholder="Client Name"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Address</Text>
            <TextInput 
              style={[styles.input, { height: 60 }]} 
              value={invoiceData.billToAddress} 
              onChangeText={(v) => setInvoiceData({...invoiceData, billToAddress: v})} 
              placeholder="Client Address"
              multiline
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invoice Date</Text>
            <TextInput 
              style={styles.input} 
              value={invoiceData.invoiceDate} 
              onChangeText={(v) => setInvoiceData({...invoiceData, invoiceDate: v})} 
              placeholder="DD/MM/YYYY"
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Line Items</Text>
          {invoiceData.items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Item {index + 1}</Text>
                {invoiceData.items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Text style={styles.removeTxt}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <TextInput 
                style={[styles.input, { marginBottom: 8 }]} 
                value={item.description} 
                onChangeText={(v) => updateItem(item.id, 'description', v)} 
                placeholder="Description / Particulars"
              />
              
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginRight: 8 }]} 
                  value={item.hsn} 
                  onChangeText={(v) => updateItem(item.id, 'hsn', v)} 
                  placeholder="HSN/SAC"
                />
                <TextInput 
                  style={[styles.input, { flex: 0.5, marginRight: 8 }]} 
                  value={String(item.qty)} 
                  onChangeText={(v) => updateItem(item.id, 'qty', parseFloat(v) || 0)} 
                  placeholder="Qty"
                  keyboardType="numeric"
                />
                <TextInput 
                  style={[styles.input, { flex: 1, marginRight: 8 }]} 
                  value={String(item.rate)} 
                  onChangeText={(v) => updateItem(item.id, 'rate', parseFloat(v) || 0)} 
                  placeholder="Rate (₹)"
                  keyboardType="numeric"
                />
                <TextInput 
                  style={[styles.input, { flex: 0.8 }]} 
                  value={String(item.gstPercent)} 
                  onChangeText={(v) => updateItem(item.id, 'gstPercent', parseFloat(v) || 0)} 
                  placeholder="GST %"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.itemTotal}>
                Amount: ₹{(item.qty * item.rate).toFixed(2)} + {item.gstPercent}% GST
              </Text>
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <Text style={styles.addBtnTxt}>+ Add Item</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxtWhite}>Save Invoice Data</Text>}
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.pdfBtn} onPress={handleGeneratePDF}>
                <Text style={styles.btnTxtWhite}>Download PDF</Text>
              </TouchableOpacity>

              {project?.status === 'completed' && (
                <TouchableOpacity style={styles.billBtn} onPress={handleMarkBilled}>
                  <Text style={styles.btnTxtWhite}>Mark as Billed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  backBtn: { marginRight: 16 },
  backTxt: { fontSize: 16, color: '#0ea5e9', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { alignSelf: 'center', width: '100%', maxWidth: 900, backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  itemRow: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  removeTxt: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  itemTotal: { marginTop: 8, fontSize: 13, color: '#64748b', textAlign: 'right' },
  addBtn: { paddingVertical: 10, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6 },
  addBtnTxt: { color: '#0ea5e9', fontWeight: '600', fontSize: 14 },
  actions: { gap: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  saveBtn: { backgroundColor: '#0ea5e9', padding: 14, borderRadius: 8, alignItems: 'center' },
  pdfBtn: { flex: 1, backgroundColor: '#f59e0b', padding: 14, borderRadius: 8, alignItems: 'center' },
  billBtn: { flex: 1, backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnTxtWhite: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
