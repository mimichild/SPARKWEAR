import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect, Link } from 'expo-router';
import { useItems, useFilteredItems } from '../../../src/hooks/useItems';
import { useCategories } from '../../../src/hooks/useCategories';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useUIStore } from '../../../src/stores/uiStore';
import { ItemCard } from '../../../src/components/items/ItemCard';
import { SearchBar } from '../../../src/components/shared/SearchBar';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { Item } from '../../../src/types';

export default function ItemsTab() {
  const router = useRouter();
  const { themeColor, purchaseSort, setPurchaseSort } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const {
    closetQuery: query, setClosetQuery,
    selectedItemIds, toggleItemSelection, clearSelection,
    isSelectionMode, enterSelectionMode,
  } = useUIStore();

  const { items, loading, removeItem, reload } = useItems(purchaseSort);
  const { categories, reload: reloadCats } = useCategories();
  const filtered = useFilteredItems(items, query);

  const catIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Reload items when screen comes back into focus (e.g. after adding/editing)
  useFocusEffect(useCallback(() => { reload(); reloadCats(); }, [reload, reloadCats]));

  const [showSearch, setShowSearch] = useState(false);
  const [bulkDeleteVisible, setBulkDeleteVisible] = useState(false);

  const handleLongPress = useCallback((itemId: string) => {
    if (!isSelectionMode) enterSelectionMode();
    toggleItemSelection(itemId);
  }, [isSelectionMode, enterSelectionMode, toggleItemSelection]);

  const handlePress = useCallback((item: Item) => {
    if (isSelectionMode) {
      toggleItemSelection(item.id);
    } else {
      router.push(`/closet/item/${item.id}`);
    }
  }, [isSelectionMode, toggleItemSelection, router]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of Array.from(selectedItemIds)) {
      await removeItem(id);
    }
    clearSelection();
    setBulkDeleteVisible(false);
  }, [selectedItemIds, removeItem, clearSelection]);

  const renderItem = useCallback(({ item }: { item: Item }) => (
    <ItemCard
      item={item}
      onPress={() => handlePress(item)}
      onLongPress={() => handleLongPress(item.id)}
      selected={selectedItemIds.has(item.id)}
      selectionMode={isSelectionMode}
      themeColor={themeColor}
      categoryName={item.categoryId ? catIdToName[item.categoryId] : undefined}
      mode="list"
    />
  ), [handlePress, handleLongPress, selectedItemIds, isSelectionMode, themeColor, catIdToName]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>單品</Text>
        <View style={styles.headerActions}>
          {isSelectionMode ? (
            <>
              <Pressable onPress={() => setBulkDeleteVisible(true)} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>刪除({selectedItemIds.size})</Text>
              </Pressable>
              <Pressable onPress={clearSelection} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>取消</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={() => setShowSearch(s => !s)} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>搜尋</Text>
              </Pressable>
              <Pressable
                onPress={() => setPurchaseSort(purchaseSort === 'desc' ? 'asc' : 'desc')}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnText}>{purchaseSort === 'desc' ? '新→舊' : '舊→新'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {showSearch && (
        <SearchBar value={query} onChangeText={setClosetQuery} placeholder="搜尋品牌/名稱/備註..." />
      )}

      {loading ? (
        <View style={styles.center}><Text style={styles.emptyText}>載入中...</Text></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {query ? '找不到符合的單品' : '還沒有單品，點右下角 + 新增'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      )}

      {!isSelectionMode && (
        <Link href="/closet/item/form" style={[styles.fab, { backgroundColor: themeColor }]}>
          <Text style={styles.fabText}>+</Text>
        </Link>
      )}

      <ConfirmDialog
        visible={bulkDeleteVisible}
        title="批次刪除"
        message={`確定要刪除 ${selectedItemIds.size} 件單品嗎？`}
        confirmLabel="刪除"
        danger
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: 12,
  },
  backBtn: { paddingRight: 8, paddingVertical: 2 },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: {
    fontSize: 36, color: '#fff', fontWeight: '100',
    lineHeight: 36, includeFontPadding: false, textAlignVertical: 'center',
  },
});
