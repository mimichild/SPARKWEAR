import { useState, useCallback } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { useOutfits, useFilteredOutfits } from '../../src/hooks/useOutfits';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useUIStore } from '../../src/stores/uiStore';
import { getPhotoUri } from '../../src/services/photoService';
import { SearchBar } from '../../src/components/shared/SearchBar';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import type { Outfit } from '../../src/types';

const COLUMNS   = 3;
const CELL_W    = Math.floor(Dimensions.get('window').width / COLUMNS);
const CELL_H    = Math.floor(CELL_W * 4 / 3);

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_W}" height="${CELL_H}"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>`
  );

export default function OutfitsScreen() {
  const router = useRouter();
  const { themeColor, outfitSort, setOutfitSort } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const {
    outfitQuery: query, setOutfitQuery,
    selectedOutfitIds, toggleOutfitSelection, clearSelection,
    isSelectionMode, enterSelectionMode,
  } = useUIStore();

  const { outfits, loading, removeOutfit, reload } = useOutfits(outfitSort);
  const filtered = useFilteredOutfits(outfits, query);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const [showSearch, setShowSearch] = useState(false);
  const [bulkDeleteVisible, setBulkDeleteVisible] = useState(false);

  const handleLongPress = useCallback((outfitId: string) => {
    if (!isSelectionMode) enterSelectionMode();
    toggleOutfitSelection(outfitId);
  }, [isSelectionMode, enterSelectionMode, toggleOutfitSelection]);

  const handlePress = useCallback((outfit: Outfit) => {
    if (isSelectionMode) toggleOutfitSelection(outfit.id);
    else router.push(`/outfits/${outfit.id}`);
  }, [isSelectionMode, toggleOutfitSelection, router]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of Array.from(selectedOutfitIds)) await removeOutfit(id);
    clearSelection();
    setBulkDeleteVisible(false);
  }, [selectedOutfitIds, removeOutfit, clearSelection]);

  const renderItem = useCallback(({ item }: { item: Outfit }) => {
    const uri = item.photoIds.length > 0 ? getPhotoUri(item.photoIds[0]) : MISSING_URI;
    const selected = selectedOutfitIds.has(item.id);
    return (
      <Pressable
        style={styles.cell}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item.id)}
      >
        <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
        {/* 日期顯示在照片下方，不遮蓋照片 */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        {/* 選取模式 checkbox */}
        {isSelectionMode && (
          <View style={[styles.checkbox, selected && { backgroundColor: themeColor, borderColor: themeColor }]}>
            {selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        {/* 選取外框 */}
        {selected && <View style={[styles.selectedBorder, { borderColor: themeColor }]} />}
      </Pressable>
    );
  }, [handlePress, handleLongPress, selectedOutfitIds, isSelectionMode, themeColor]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>穿搭紀錄</Text>
        <View style={styles.headerActions}>
          {isSelectionMode ? (
            <>
              <Pressable onPress={() => setBulkDeleteVisible(true)} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>刪除({selectedOutfitIds.size})</Text>
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
                onPress={() => setOutfitSort(outfitSort === 'desc' ? 'asc' : 'desc')}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnText}>{outfitSort === 'desc' ? '新→舊' : '舊→新'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {showSearch && (
        <SearchBar
          value={query}
          onChangeText={setOutfitQuery}
          placeholder="搜尋天氣/縣市/地點/想法..."
        />
      )}

      {loading ? (
        <View style={styles.center}><Text style={styles.emptyText}>載入中...</Text></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {query ? '找不到符合的穿搭' : '還沒有穿搭紀錄，點右下角 + 新增'}
          </Text>
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

      {!isSelectionMode && (
        <Pressable
          onPress={() => router.push('/outfits/form')}
          style={[styles.fab, { backgroundColor: themeColor }]}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}

      <ConfirmDialog
        visible={bulkDeleteVisible}
        title="批次刪除"
        message={`確定要刪除 ${selectedOutfitIds.size} 筆穿搭嗎？`}
        confirmLabel="刪除"
        danger
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },

  cell: {
    width: CELL_W,
    padding: 1,
    backgroundColor: '#fff',
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  dateRow: {
    paddingVertical: 3,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dateText: { fontSize: 10, color: '#666', textAlign: 'center' },
  checkbox: {
    position: 'absolute', top: 7, right: 7, zIndex: 10,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  selectedBorder: {
    position: 'absolute',
    top: 1, left: 1, right: 1,
    aspectRatio: 3 / 4,
    borderWidth: 2,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf9f7' },
  emptyText: { color: '#bbb', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
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
