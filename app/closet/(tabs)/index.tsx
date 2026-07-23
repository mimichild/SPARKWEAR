import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { useItems, useFilteredItems } from '../../../src/hooks/useItems';
import { useCategories, useOrigins, useColors } from '../../../src/hooks/useCategories';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useUIStore } from '../../../src/stores/uiStore';
import { ItemCard } from '../../../src/components/items/ItemCard';
import { SearchBar } from '../../../src/components/shared/SearchBar';
import { BatchActionBar } from '../../../src/components/shared/BatchActionBar';
import { CategoryPickerModal } from '../../../src/components/shared/CategoryPickerModal';
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

  const { items, loading, trashItem, recategorizeItem, reload } = useItems(purchaseSort);
  const { categories, reload: reloadCats } = useCategories();
  const { origins } = useOrigins();
  const { colors } = useColors();

  const catIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const originIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    origins.forEach(o => { map[o.id] = o.name; });
    return map;
  }, [origins]);

  const colorIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    colors.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [colors]);

  const filtered = useFilteredItems(items, query, {
    catNames: catIdToName,
    originNames: originIdToName,
    colorNames: colorIdToName,
  });

  const [showSearch, setShowSearch] = useState(false);
  const [trashConfirmVisible, setTrashConfirmVisible] = useState(false);
  const [catPickerVisible, setCatPickerVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    reload();
    reloadCats();
    setClosetQuery('');
    setShowSearch(false);
  }, [reload, reloadCats, setClosetQuery]));

  const handleLongPress = useCallback((itemId: string) => {
    if (!isSelectionMode) enterSelectionMode();
    toggleItemSelection(itemId);
  }, [isSelectionMode, enterSelectionMode, toggleItemSelection]);

  const handlePress = useCallback((item: Item) => {
    if (isSelectionMode) toggleItemSelection(item.id);
    else router.push(`/closet/item/${item.id}`);
  }, [isSelectionMode, toggleItemSelection, router]);

  const handleBulkTrash = useCallback(async () => {
    for (const id of Array.from(selectedItemIds)) await trashItem(id);
    clearSelection();
    setTrashConfirmVisible(false);
  }, [selectedItemIds, trashItem, clearSelection]);

  const handleBulkRecategorize = useCallback(async (categoryId: string) => {
    for (const id of Array.from(selectedItemIds)) await recategorizeItem(id, categoryId);
    clearSelection();
    setCatPickerVisible(false);
  }, [selectedItemIds, recategorizeItem, clearSelection]);

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
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.replace('/')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>返回</Text>
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>單品</Text>
        <View style={styles.headerRight}>
          {isSelectionMode ? (
            <Pressable onPress={clearSelection} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>取消</Text>
            </Pressable>
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

      {showSearch && !isSelectionMode && (
        <SearchBar value={query} onChangeText={setClosetQuery} placeholder="搜尋品牌/名稱/分類/來源/顏色/分級/季節..." />
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
        <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} />
      )}

      {isSelectionMode && (
        <BatchActionBar
          count={selectedItemIds.size}
          onDelete={() => setTrashConfirmVisible(true)}
          onRecategorize={() => setCatPickerVisible(true)}
          onCancel={clearSelection}
          themeColor={themeColor}
        />
      )}

      {!isSelectionMode && (
        <Pressable
          onPress={() => router.push('/closet/item/form')}
          style={[styles.fab, { backgroundColor: themeColor }]}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}

      <ConfirmDialog
        visible={trashConfirmVisible}
        title="移至暫存區"
        message={`確定要將 ${selectedItemIds.size} 件單品移至暫存區嗎？\n30 天內可在設定中還原。`}
        confirmLabel="移至暫存區"
        danger
        onConfirm={handleBulkTrash}
        onCancel={() => setTrashConfirmVisible(false)}
      />

      <CategoryPickerModal
        visible={catPickerVisible}
        categories={categories}
        onSelect={handleBulkRecategorize}
        onCancel={() => setCatPickerVisible(false)}
        themeColor={themeColor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: 12,
  },
  headerLeft: { flex: 1 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  backBtn: { paddingVertical: 2, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
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
    fontFamily: 'sans-serif',
    lineHeight: 36, includeFontPadding: false, textAlignVertical: 'center',
  },
});
