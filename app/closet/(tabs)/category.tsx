import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from '../../../src/db/context';
import { useCategories } from '../../../src/hooks/useCategories';
import { useItems } from '../../../src/hooks/useItems';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import {
  addCategory, deleteCategory, reorderCategories,
} from '../../../src/services/categoryService';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { Category } from '../../../src/types';

// 新增分類時依序使用的預設顏色
const PALETTE = [
  '#f48fb1','#ce93d8','#90caf9','#a5d6a7','#80cbc4',
  '#ffe082','#bcaaa4','#ef9a9a','#b0bec5','#c5cae9',
];

export default function CategoryTab() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { categories, reload: reloadCats } = useCategories();
  const { items, reload: reloadItems } = useItems();

  const [editVisible, setEditVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    reloadCats();
    reloadItems();
  }, [reloadCats, reloadItems]));

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const key = item.categoryId ?? '__none__';
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const uncategorized = countByCategory['__none__'] ?? 0;

  // ── 編輯操作 ──────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some(c => c.name === name)) {
      Alert.alert('已有同名分類');
      return;
    }
    setAdding(true);
    try {
      const color = PALETTE[categories.length % PALETTE.length];
      await addCategory(db, name, color);
      setNewName('');
      await reloadCats();
    } finally {
      setAdding(false);
    }
  }, [newName, categories, db, reloadCats]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteCategory(db, id);
    await reloadCats();
    await reloadItems();
    setDeletingId(null);
  }, [db, reloadCats, reloadItems]);

  const handleMove = useCallback(async (index: number, dir: 'up' | 'down') => {
    const newOrder = [...categories];
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]];
    await reorderCategories(db, newOrder.map(c => c.id));
    await reloadCats();
  }, [categories, db, reloadCats]);

  // ── 分類列表渲染 ──────────────────────────────────────────────

  const renderCategory = useCallback((cat: Category) => {
    const count = countByCategory[cat.id] ?? 0;
    return (
      <Pressable
        key={cat.id}
        style={styles.chip}
        onPress={() => router.push(`/closet/category/${encodeURIComponent(cat.name)}`)}
      >
        <Text style={styles.chipName}>{cat.name}</Text>
        <Text style={styles.chipCount}>{count}</Text>
      </Pressable>
    );
  }, [countByCategory, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>分類</Text>
        <Pressable onPress={() => setEditVisible(true)} style={styles.editBtn}>
          <Text style={styles.editBtnText}>編輯</Text>
        </Pressable>
      </View>

      {/* 分類清單 */}
      <ScrollView contentContainerStyle={styles.list}>
        {categories.map(renderCategory)}
        {uncategorized > 0 && (
          <Pressable
            style={styles.chip}
            onPress={() => router.push(`/closet/category/${encodeURIComponent('未分類')}`)}
          >
            <Text style={styles.chipName}>未分類</Text>
            <Text style={styles.chipCount}>{uncategorized}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* 編輯分類 Modal */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>編輯類別</Text>
            <Pressable onPress={() => setEditVisible(false)} style={styles.modalClose}>
              <Text style={[styles.modalCloseText, { color: themeColor }]}>完成</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll}>
            {/* 分類列表（可排序 / 刪除） */}
            {categories.map((cat, index) => (
              <View key={cat.id} style={styles.editRow}>
                {/* 上下移位 */}
                <View style={styles.arrowGroup}>
                  <Pressable
                    onPress={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    style={styles.arrowBtn}
                  >
                    <Text style={[styles.arrowText, index === 0 && styles.arrowDisabled]}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleMove(index, 'down')}
                    disabled={index === categories.length - 1}
                    style={styles.arrowBtn}
                  >
                    <Text style={[styles.arrowText, index === categories.length - 1 && styles.arrowDisabled]}>↓</Text>
                  </Pressable>
                </View>

                <Text style={styles.editCatName}>{cat.name}</Text>
                <Text style={styles.editCatCount}>{countByCategory[cat.id] ?? 0} 件</Text>

                {/* 刪除 */}
                <Pressable
                  onPress={() => setDeletingId(cat.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>刪除</Text>
                </Pressable>
              </View>
            ))}

            {/* 新增分類 */}
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

      {/* 確認刪除 */}
      <ConfirmDialog
        visible={!!deletingId}
        title="刪除分類"
        message={`確定刪除「${categories.find(c => c.id === deletingId)?.name ?? ''}」？\n該分類的單品將移至「未分類」。`}
        confirmLabel="刪除"
        danger
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { paddingRight: 8, paddingVertical: 2 },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  editBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  editBtnText: { fontSize: 14, color: '#fff' },

  list: { padding: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#eee',
  },
  chipName: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  chipCount: { fontSize: 14, color: '#aaa', fontWeight: '500' },

  // Modal
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
