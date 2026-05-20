import { useState, useCallback, useMemo } from 'react';
import { View, Image, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useItems, useFilteredItems } from '../../../src/hooks/useItems';
import { useCategories } from '../../../src/hooks/useCategories';
import { useUIStore } from '../../../src/stores/uiStore';
import { getPhotoUri } from '../../../src/services/photoService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { SearchBar } from '../../../src/components/shared/SearchBar';
import { BatchActionBar } from '../../../src/components/shared/BatchActionBar';
import { CategoryPickerModal } from '../../../src/components/shared/CategoryPickerModal';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { Item } from '../../../src/types';

const COLUMNS = 3;
const CELL_WIDTH = Math.floor(Dimensions.get('window').width / COLUMNS);
const CELL_HEIGHT = Math.floor(CELL_WIDTH * 4 / 3);

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>'
  );

export default function PhotosTab() {
  const router = useRouter();
  const { themeColor, purchaseSort, setPurchaseSort } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { items, loading, trashItem, recategorizeItem, reload } = useItems(purchaseSort);
  const { categories } = useCategories();
  const {
    selectedItemIds, toggleItemSelection, clearSelection,
    isSelectionMode, enterSelectionMode,
  } = useUIStore();

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [trashConfirmVisible, setTrashConfirmVisible] = useState(false);
  const [catPickerVisible, setCatPickerVisible] = useState(false);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const withPhotos = useMemo(() => items.filter(item => item.photoIds.length > 0), [items]);
  const filtered = useFilteredItems(withPhotos, query);

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

  const renderItem = useCallback(({ item }: { item: Item }) => {
    const uri = getPhotoUri(item.photoIds[0]);
    const selected = selectedItemIds.has(item.id);
    return (
      <Pressable
        style={styles.cell}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item.id)}
      >
        <Image source={{ uri }} style={styles.photo} resizeMode="cover" defaultSource={{ uri: MISSING_URI }} />
        {isSelectionMode && (
          <View style={[styles.checkbox, selected && { backgroundColor: themeColor, borderColor: themeColor }]}>
            {selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        {selected && <View style={[styles.selectedBorder, { borderColor: themeColor }]} />}
      </Pressable>
    );
  }, [handlePress, handleLongPress, selectedItemIds, isSelectionMode, themeColor]);

  const header = (
    <View style={[styles.headerWrap, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => { clearSelection(); router.back(); }} style={styles.backBtn}>
            <Text style={styles.backBtnText}>返回</Text>
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>照片</Text>
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
        <SearchBar value={query} onChangeText={setQuery} placeholder="搜尋品牌/名稱..." onClear={() => setQuery('')} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {header}
      {!loading && filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{query ? '找不到符合的單品' : '還沒有附照片的單品'}</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          numColumns={COLUMNS}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
        />
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
  headerWrap: { paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  headerLeft: { flex: 1 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  backBtn: { paddingVertical: 2, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },
  cell: { width: CELL_WIDTH, height: CELL_HEIGHT, padding: 1 },
  photo: { width: '100%', height: '100%' },
  checkbox: {
    position: 'absolute', top: 6, right: 6, zIndex: 10,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  selectedBorder: {
    position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderWidth: 2,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
});
