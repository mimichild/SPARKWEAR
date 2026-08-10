import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Category } from '../../types';

interface CategoryEditModalProps {
  visible: boolean;
  categories: Category[];
  themeColor: string;
  countByCategory?: Record<string, number>;
  onClose: () => void;
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (index: number, dir: 'up' | 'down') => Promise<void>;
}

export function CategoryEditModal({
  visible, categories, themeColor, countByCategory,
  onClose, onAdd, onDelete, onMove,
}: CategoryEditModalProps) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some(c => c.name === name)) {
      Alert.alert('已有同名分類');
      return;
    }
    setAdding(true);
    try {
      await onAdd(name);
      setNewName('');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>編輯類別</Text>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Text style={[styles.modalCloseText, { color: themeColor }]}>完成</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll}>
            {categories.map((cat, index) => (
              <View key={cat.id} style={styles.editRow}>
                <View style={styles.arrowGroup}>
                  <Pressable
                    onPress={() => onMove(index, 'up')}
                    disabled={index === 0}
                    style={styles.arrowBtn}
                  >
                    <Text style={[styles.arrowText, index === 0 && styles.arrowDisabled]}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onMove(index, 'down')}
                    disabled={index === categories.length - 1}
                    style={styles.arrowBtn}
                  >
                    <Text style={[styles.arrowText, index === categories.length - 1 && styles.arrowDisabled]}>↓</Text>
                  </Pressable>
                </View>

                <Text style={styles.editCatName}>{cat.name}</Text>
                {countByCategory && (
                  <Text style={styles.editCatCount}>{countByCategory[cat.id] ?? 0} 件</Text>
                )}

                <Pressable
                  onPress={() => setDeletingId(cat.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>刪除</Text>
                </Pressable>
              </View>
            ))}

            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="新增分類名稱"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <Pressable
                onPress={handleAdd}
                disabled={adding || !newName.trim()}
                style={[styles.addBtn, { backgroundColor: themeColor }, (!newName.trim() || adding) && styles.addBtnDisabled]}
              >
                <Text style={styles.addBtnText}>新增</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ConfirmDialog
        visible={!!deletingId}
        title="刪除分類"
        message={`確定刪除「${categories.find(c => c.id === deletingId)?.name ?? ''}」？\n該分類的單品將移至「未分類」。`}
        confirmLabel="刪除"
        danger
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#faf9f7' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 15, fontWeight: '600' },
  modalScroll: { flex: 1 },

  editRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0ede8',
    backgroundColor: '#fff', gap: 8,
  },
  arrowGroup: { flexDirection: 'row', gap: 2 },
  arrowBtn: { padding: 4 },
  arrowText: { fontSize: 16, color: '#555' },
  arrowDisabled: { color: '#ddd' },
  editCatName: { flex: 1, fontSize: 15, color: '#222' },
  editCatCount: { fontSize: 13, color: '#aaa' },
  deleteBtn: {
    borderWidth: 1, borderColor: '#e57373', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  deleteBtnText: { fontSize: 13, color: '#e57373' },

  addRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 10,
  },
  addInput: {
    flex: 1, borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fafafa',
  },
  addBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
