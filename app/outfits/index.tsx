import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect, Link } from 'expo-router';
import { useOutfits, useFilteredOutfits } from '../../src/hooks/useOutfits';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useUIStore } from '../../src/stores/uiStore';
import { OutfitCard } from '../../src/components/outfits/OutfitCard';
import { SearchBar } from '../../src/components/shared/SearchBar';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import type { Outfit } from '../../src/types';

const NUM_COLUMNS = 3;

export default function OutfitsScreen() {
  const router = useRouter();
  const { themeColor, outfitSort, setOutfitSort } = useSettingsStore();
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
    if (isSelectionMode) {
      toggleOutfitSelection(outfit.id);
    } else {
      router.push(`/outfits/${outfit.id}`);
    }
  }, [isSelectionMode, toggleOutfitSelection, router]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of Array.from(selectedOutfitIds)) {
      await removeOutfit(id);
    }
    clearSelection();
    setBulkDeleteVisible(false);
  }, [selectedOutfitIds, removeOutfit, clearSelection]);

  const renderItem = useCallback(({ item }: { item: Outfit }) => (
    <View style={styles.cardWrapper}>
      <OutfitCard
        outfit={item}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item.id)}
        selected={selectedOutfitIds.has(item.id)}
        selectionMode={isSelectionMode}
        themeColor={themeColor}
      />
    </View>
  ), [handlePress, handleLongPress, selectedOutfitIds, isSelectionMode, themeColor]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← 返回</Text>
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
          numColumns={NUM_COLUMNS}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      {!isSelectionMode && (
        <Link href="/outfits/form" style={[styles.fab, { backgroundColor: themeColor }]}>
          <Text style={styles.fabText}>+</Text>
        </Link>
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
  list: { padding: 6 },
  cardWrapper: { flex: 1, margin: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
