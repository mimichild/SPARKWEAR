import { useState, useCallback, useMemo } from 'react';
import { View, Image, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useItems, useFilteredItems } from '../../../src/hooks/useItems';
import { getPhotoUri } from '../../../src/services/photoService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
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

export default function PhotosTab() {
  const router = useRouter();
  const { themeColor, purchaseSort, setPurchaseSort } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { items, loading, reload } = useItems(purchaseSort);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const withPhotos = useMemo(
    () => items.filter(item => item.photoIds.length > 0),
    [items]
  );

  const filtered = useFilteredItems(withPhotos, query);

  const renderItem = useCallback(({ item }: { item: Item }) => {
    const uri = getPhotoUri(item.photoIds[0]);
    return (
      <Pressable onPress={() => router.push(`/closet/item/${item.id}`)} style={styles.cell}>
        <Image
          source={{ uri }}
          style={styles.photo}
          resizeMode="cover"
          defaultSource={{ uri: MISSING_URI }}
        />
      </Pressable>
    );
  }, [router]);

  const sortLabel = purchaseSort === 'desc' ? '新→舊' : '舊→新';

  const header = (
    <View style={[styles.headerWrap, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>照片</Text>
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
      {showSearch && (
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="搜尋品牌/名稱..."
          onClear={() => setQuery('')}
        />
      )}
    </View>
  );

  if (!loading && filtered.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        {header}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {query ? '找不到符合的單品' : '還沒有附照片的單品'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {header}
      <FlashList
        data={filtered}
        renderItem={renderItem}
        numColumns={COLUMNS}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  headerWrap: { paddingBottom: 10 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { paddingRight: 8, paddingVertical: 2 },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },
  cell: { width: CELL_WIDTH, height: CELL_HEIGHT },
  photo: { width: '100%', height: '100%' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
});
