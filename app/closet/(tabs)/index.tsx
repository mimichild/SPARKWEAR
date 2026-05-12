import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { useItems, useFilteredItems } from '../../../src/hooks/useItems';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useUIStore } from '../../../src/stores/uiStore';
import { ItemCard } from '../../../src/components/items/ItemCard';
import { SearchBar } from '../../../src/components/shared/SearchBar';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { Item } from '../../../src/types';

const NUM_COLUMNS = 2;

export default function ItemsTab() {
  const router = useRouter();
  const { themeColor, purchaseSort, setPurchaseSort } = useSettingsStore();
  const {
    closetQuery: query, setClosetQuery,
    selectedItemIds, toggleItemSelection, clearSelection,
    isSelectionMode, enterSelectionMode,
  } = useUIStore();

  const { items, loading, removeItem, reload } = useItems(purchaseSort);
  const filtered = useFilteredItems(items, query);

  // Reload items when screen comes back into focus (e.g. after adding/editing)
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

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
    <View style={styles.cardWrapper}>
      <ItemCard
        item={item}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item.id)}
        selected={selectedItemIds.has(item.id)}
        selectionMode={isSelectionMode}
        themeColor={themeColor}
      />
    </View>
  ), [handlePress, handleLongPress, selectedItemIds, isSelectionMode, themeColor]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Text style={styles.headerTitle}>我的衣櫃</Text>
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
          numColumns={NUM_COLUMNS}
keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {!isSelectionMode && (
        <Pressable
          style={[styles.fab, { backgroundColor: themeColor }]}
          onPress={() => router.push('/closet/item/form')}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
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
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },
  list: { padding: 10 },
  cardWrapper: { flex: 1, margin: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
