import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from '../../../src/db/context';
import { useCategories } from '../../../src/hooks/useCategories';
import { useItems } from '../../../src/hooks/useItems';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { reorderCategories } from '../../../src/services/categoryService';
import { CategoryEditModal } from '../../../src/components/shared/CategoryEditModal';
import { CATEGORY_PALETTE } from '../../../src/constants/defaults';
import type { Category } from '../../../src/types';

export default function CategoryTab() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { categories, reload: reloadCats, addCategory, deleteCategory } = useCategories();
  const { items, reload: reloadItems } = useItems();

  const [editVisible, setEditVisible] = useState(false);

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

  const handleAdd = useCallback(async (name: string) => {
    const color = CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length];
    await addCategory(name, color);
  }, [categories, addCategory]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteCategory(id);
    await reloadItems();
  }, [deleteCategory, reloadItems]);

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
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.replace('/')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>返回</Text>
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>分類</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setEditVisible(true)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>編輯</Text>
          </Pressable>
        </View>
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

      <CategoryEditModal
        visible={editVisible}
        categories={categories}
        themeColor={themeColor}
        countByCategory={countByCategory}
        onClose={() => setEditVisible(false)}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onMove={handleMove}
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
  headerLeft: { flex: 1 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backBtn: { paddingVertical: 2, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
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
});
