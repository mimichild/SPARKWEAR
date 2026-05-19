import { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategories } from '../../../src/hooks/useCategories';
import { useItems } from '../../../src/hooks/useItems';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import type { Category } from '../../../src/types';

export default function CategoryTab() {
  const router = useRouter();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { categories, reload: reloadCats } = useCategories();
  const { items, reload: reloadItems } = useItems();

  useFocusEffect(useCallback(() => {
    reloadCats();
    reloadItems();
  }, [reloadCats, reloadItems]));

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const key = item.categoryId ?? '__none__';
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const uncategorized = countByCategory['__none__'] ?? 0;

  const renderCategory = useCallback((cat: Category) => {
    const count = countByCategory[cat.id] ?? 0;
    return (
      <Pressable
        key={cat.id}
        style={styles.chip}
        onPress={() => router.push(`/closet/category/${encodeURIComponent(cat.name)}`)}
      >
        <View style={[styles.dot, { backgroundColor: cat.color }]} />
        <Text style={styles.chipName}>{cat.name}</Text>
        <Text style={styles.chipCount}>{count}</Text>
      </Pressable>
    );
  }, [countByCategory, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>分類瀏覽</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {categories.map(renderCategory)}
        {uncategorized > 0 && (
          <Pressable
            style={styles.chip}
            onPress={() => router.push(`/closet/category/${encodeURIComponent('未分類')}`)}
          >
            <View style={[styles.dot, { backgroundColor: '#ccc' }]} />
            <Text style={styles.chipName}>未分類</Text>
            <Text style={styles.chipCount}>{uncategorized}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  list: { padding: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#eee',
    gap: 10,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  chipName: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  chipCount: { fontSize: 14, color: '#aaa', fontWeight: '500' },
});
