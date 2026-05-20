import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  Dimensions, FlatList,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, useFocusEffect, Link } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useItems, useFilteredItems } from '../../../src/hooks/useItems';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useCategories } from '../../../src/hooks/useCategories';
import { useUIStore } from '../../../src/stores/uiStore';
import { getPhotoUri } from '../../../src/services/photoService';
import { SearchBar } from '../../../src/components/shared/SearchBar';
import type { Item } from '../../../src/types';

const COLUMNS = 3;
const CELL_WIDTH = Math.floor(Dimensions.get('window').width / COLUMNS);
const CELL_HEIGHT = Math.floor(CELL_WIDTH * 4 / 3);

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>'
  );

export default function CategoryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const { themeColor, purchaseSort, setPurchaseSort } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { items, reload } = useItems(purchaseSort);
  const { categories, reload: reloadCats } = useCategories();
  const { closetQuery: query, setClosetQuery } = useUIStore();

  const [activeTab, setActiveTab] = useState<'items' | 'photos'>('items');
  const [showSearch, setShowSearch] = useState(false);

  useFocusEffect(useCallback(() => {
    reload();
    reloadCats();
  }, [reload, reloadCats]));

  const decodedName = decodeURIComponent(name ?? '');
  const category = categories.find(c => c.name === decodedName);

  const categoryItems = useMemo(() => items.filter(item =>
    category
      ? item.categoryId === category.id
      : !item.categoryId || !categories.some(c => c.id === item.categoryId)
  ), [items, category, categories]);

  const filtered = useFilteredItems(categoryItems, query);
  const withPhotos = useMemo(() => filtered.filter(i => i.photoIds.length > 0), [filtered]);

  // ── 單品列表 ──────────────────────────────────────────────────
  const renderListItem = useCallback(({ item }: { item: Item }) => {
    const uri = item.photoIds[0] ? getPhotoUri(item.photoIds[0]) : MISSING_URI;
    const metaParts: string[] = [decodedName];
    if (item.usageCount > 0) metaParts.push(`使用次數：${item.usageCount}`);

    return (
      <Pressable style={styles.listRow} onPress={() => router.push(`/closet/item/${item.id}`)}>
        <Image source={{ uri }} style={styles.listThumb} resizeMode="cover" />
        <View style={styles.listInfo}>
          <Text style={styles.listName} numberOfLines={2}>
            {item.brand
              ? <><Text style={styles.listBrand}>{item.brand} </Text>{item.name}</>
              : item.name}
          </Text>
          <Text style={styles.listSub}>{metaParts.join('・')}</Text>
        </View>
      </Pressable>
    );
  }, [router, decodedName]);

  // ── 照片格 ────────────────────────────────────────────────────
  const renderPhotoItem = useCallback(({ item }: { item: Item }) => {
    const uri = getPhotoUri(item.photoIds[0]);
    return (
      <Pressable style={styles.cell} onPress={() => router.push(`/closet/item/${item.id}`)}>
        <Image source={{ uri }} style={styles.cellPhoto} resizeMode="cover" />
      </Pressable>
    );
  }, [router]);

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
          <Pressable onPress={() => setShowSearch(s => !s)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>搜尋</Text>
          </Pressable>
          <Pressable
            onPress={() => setPurchaseSort(purchaseSort === 'desc' ? 'asc' : 'desc')}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>{sortLabel}</Text>
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <SearchBar
          value={query}
          onChangeText={setClosetQuery}
          placeholder="搜尋品牌 / 名稱..."
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

      {/* FAB 新增 */}
      <Link href="/closet/item/form" style={[styles.fab, { backgroundColor: themeColor }]}>
        <Text style={styles.fabText}>+</Text>
      </Link>
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

  // List view
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0ede8',
    backgroundColor: '#fff', gap: 12,
  },
  listThumb: { width: 56, height: 75, borderRadius: 6, backgroundColor: '#e5e0d8' },
  listInfo: { flex: 1 },
  listBrand: { fontWeight: '700', color: '#222', fontSize: 14 },
  listName: { fontSize: 14, color: '#222', lineHeight: 20 },
  listSub: { fontSize: 12, color: '#aaa', marginTop: 4 },

  // Photo grid
  cell: { width: CELL_WIDTH, height: CELL_HEIGHT, padding: 1 },
  cellPhoto: { width: '100%', height: '100%' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
