import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  Dimensions, FlatList,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useItems, useFilteredItems } from '../../../src/hooks/useItems';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useCategories, useOrigins, useColors } from '../../../src/hooks/useCategories';
import { useUIStore } from '../../../src/stores/uiStore';
import { getPhotoUri } from '../../../src/services/photoService';
import { SearchBar } from '../../../src/components/shared/SearchBar';
import { BatchActionBar } from '../../../src/components/shared/BatchActionBar';
import { CategoryPickerModal } from '../../../src/components/shared/CategoryPickerModal';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import { ItemCard } from '../../../src/components/items/ItemCard';
import type { Item } from '../../../src/types';

const COLUMNS = 3;
const CELL_WIDTH = Math.floor(Dimensions.get('window').width / COLUMNS);
const CELL_HEIGHT = Math.floor(CELL_WIDTH * 4 / 3);


export default function CategoryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const { themeColor, purchaseSort, setPurchaseSort } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { items, reload, trashItem, recategorizeItem } = useItems(purchaseSort);
  const { categories, reload: reloadCats } = useCategories();
  const { origins } = useOrigins();
  const { colors } = useColors();
  const {
    closetQuery: query, setClosetQuery,
    selectedItemIds, toggleItemSelection, clearSelection,
    isSelectionMode, enterSelectionMode,
  } = useUIStore();

  const [activeTab, setActiveTab] = useState<'items' | 'photos'>('items');
  const [showSearch, setShowSearch] = useState(false);
  const [trashConfirmVisible, setTrashConfirmVisible] = useState(false);
  const [catPickerVisible, setCatPickerVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    reload();
    reloadCats();
    setClosetQuery('');
    setShowSearch(false);
    return () => clearSelection();
  }, [reload, reloadCats, setClosetQuery, clearSelection]));

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

  const decodedName = decodeURIComponent(name ?? '');
  const category = categories.find(c => c.name === decodedName);

  const categoryItems = useMemo(() => items.filter(item =>
    category
      ? item.categoryId === category.id
      : !item.categoryId || !categories.some(c => c.id === item.categoryId)
  ), [items, category, categories]);

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

  const catIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const filtered = useFilteredItems(categoryItems, query, {
    catNames: catIdToName,
    originNames: originIdToName,
    colorNames: colorIdToName,
  });
  const withPhotos = useMemo(() => filtered.filter(i => i.photoIds.length > 0), [filtered]);

  // ── 單品列表 ──────────────────────────────────────────────────
  const renderListItem = useCallback(({ item }: { item: Item }) => (
    <ItemCard
      item={item}
      onPress={() => handlePress(item)}
      onLongPress={() => handleLongPress(item.id)}
      selected={selectedItemIds.has(item.id)}
      selectionMode={isSelectionMode}
      themeColor={themeColor}
      categoryName={decodedName}
      mode="list"
    />
  ), [handlePress, handleLongPress, selectedItemIds, isSelectionMode, themeColor, decodedName]);

  // ── 照片格 ────────────────────────────────────────────────────
  const renderPhotoItem = useCallback(({ item }: { item: Item }) => {
    const uri = getPhotoUri(item.photoIds[0]);
    const selected = selectedItemIds.has(item.id);
    return (
      <Pressable
        style={styles.cell}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item.id)}
      >
        <Image source={{ uri }} style={styles.cellPhoto} resizeMode="cover" />
        {isSelectionMode && (
          <View style={[styles.checkbox, selected && { backgroundColor: themeColor, borderColor: themeColor }]}>
            {selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        {selected && <View style={[styles.selectedBorder, { borderColor: themeColor }]} />}
      </Pressable>
    );
  }, [handlePress, handleLongPress, selectedItemIds, isSelectionMode, themeColor]);

  const sortLabel = purchaseSort === 'desc' ? '新→舊' : '舊→新';
  const isEmpty = activeTab === 'items' ? filtered.length === 0 : withPhotos.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{decodedName}</Text>
        <View style={styles.headerActions}>
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
                <Text style={styles.headerBtnText}>{sortLabel}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Search bar */}
      {showSearch && !isSelectionMode && (
        <SearchBar
          value={query}
          onChangeText={setClosetQuery}
          placeholder="搜尋品牌/名稱/分類/來源/顏色/分級/季節..."
          onClear={() => setClosetQuery('')}
        />
      )}

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <Pressable style={styles.tabBtn} onPress={() => setActiveTab('items')}>
          <Text style={[styles.tabLabel, activeTab === 'items' && { color: themeColor, fontWeight: '700' }]}>
            單品
          </Text>
          {activeTab === 'items' && <View style={[styles.tabLine, { backgroundColor: themeColor }]} />}
        </Pressable>
        <Pressable style={styles.tabBtn} onPress={() => setActiveTab('photos')}>
          <Text style={[styles.tabLabel, activeTab === 'photos' && { color: themeColor, fontWeight: '700' }]}>
            照片
          </Text>
          {activeTab === 'photos' && <View style={[styles.tabLine, { backgroundColor: themeColor }]} />}
        </Pressable>
      </View>

      {/* Content */}
      {isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {query ? '找不到符合的單品' : '此分類沒有單品'}
          </Text>
        </View>
      ) : activeTab === 'items' ? (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderListItem}
          style={styles.flex}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlashList
          data={withPhotos}
          keyExtractor={item => item.id}
          renderItem={renderPhotoItem}
          numColumns={COLUMNS}
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
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { paddingRight: 8, paddingVertical: 2 },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 15, color: '#999' },
  tabLine: { height: 2, width: 32, borderRadius: 1, marginTop: 4 },

  // Photo grid
  cell: { width: CELL_WIDTH, height: CELL_HEIGHT, padding: 1 },
  cellPhoto: { width: '100%', height: '100%' },
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
});
