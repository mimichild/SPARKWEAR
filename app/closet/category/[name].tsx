import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useItems } from '../../../src/hooks/useItems';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useCategories } from '../../../src/hooks/useCategories';
import { ItemCard } from '../../../src/components/items/ItemCard';
import type { Item } from '../../../src/types';

const NUM_COLUMNS = 2;

export default function CategoryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { items, reload } = useItems();
  const { categories } = useCategories();

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const decodedName = decodeURIComponent(name ?? '');
  const category = categories.find(c => c.name === decodedName);

  const categoryItems = items.filter(item =>
    category
      ? item.categoryId === category.id
      : !item.categoryId || !categories.some(c => c.id === item.categoryId)
  );

  const renderItem = useCallback(({ item }: { item: Item }) => (
    <View style={styles.cardWrapper}>
      <ItemCard
        item={item}
        onPress={() => router.push(`/closet/item/${item.id}`)}
        themeColor={themeColor}
      />
    </View>
  ), [router, themeColor]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{decodedName}</Text>
        <Text style={styles.headerCount}>{categoryItems.length} 件</Text>
      </View>

      {categoryItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>此分類沒有單品</Text>
        </View>
      ) : (
        <FlashList
          data={categoryItems}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 15, color: '#fff' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  headerCount: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  list: { padding: 10 },
  cardWrapper: { flex: 1, margin: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
});
