import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, Alert, Image, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from '../../src/db/context';
import { getItems, filterItems, incrementUsageCount } from '../../src/services/itemService';
import { getCategories } from '../../src/services/categoryService';
import { getPhotoUri } from '../../src/services/photoService';
import { logItemUsages } from '../../src/services/usageLogService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { SearchBar } from '../../src/components/shared/SearchBar';
import type { Item, Category } from '../../src/types';

const TODAY = new Date().toISOString().slice(0, 10);
const SCREEN_W = Dimensions.get('window').width;
const ITEM_CELL_W = Math.floor((SCREEN_W - 28 - 24 - 12) / 3);
const ITEM_CELL_H = Math.floor(ITEM_CELL_W * 4 / 3);
const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>`);

export default function ManualLogScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(TODAY);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemQuery, setItemQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getItems(db), getCategories(db)]).then(([items, cats]) => {
      setAllItems(items);
      setCategories(cats);
    });
  }, [db]);

  const filteredItems = (() => {
    let items = allItems;
    if (itemQuery) items = filterItems(items, itemQuery);
    if (selectedCategoryId) items = items.filter(i => i.categoryId === selectedCategoryId);
    return items;
  })();

  const toggleItem = useCallback((itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!date) { Alert.alert('請選擇日期'); return; }
    if (selectedItemIds.size === 0) { Alert.alert('請至少選擇一件單品'); return; }
    setSaving(true);
    try {
      const ids = Array.from(selectedItemIds);
      for (const id of ids) await incrementUsageCount(db, id);
      await logItemUsages(db, ids, date, 'manual-log');
      router.back();
    } catch (e) {
      Alert.alert('儲存失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setSaving(false);
    }
  }, [date, selectedItemIds, db, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>取消</Text>
        </Pressable>
        <Text style={styles.headerTitle}>手動登錄穿搭次數</Text>
        <Pressable onPress={handleSave} disabled={saving} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { fontWeight: '700' }]}>
            {saving ? '儲存中...' : '儲存'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 日期 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>穿搭日期</Text>
          <TextInput
            style={styles.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
          <Text style={styles.hint}>格式：YYYY-MM-DD，例如 2026-07-01</Text>
        </View>

        {/* 搭配單品 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            搭配單品{selectedItemIds.size > 0 ? `（已選 ${selectedItemIds.size} 件）` : ''}
          </Text>

          <SearchBar value={itemQuery} onChangeText={setItemQuery} placeholder="搜尋品牌或名稱..." />

          {/* 分類 chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            <Pressable
              style={[styles.catChip, !selectedCategoryId && { backgroundColor: themeColor, borderColor: themeColor }]}
              onPress={() => setSelectedCategoryId('')}
            >
              <Text style={[styles.catChipText, !selectedCategoryId && { color: '#fff' }]}>全部</Text>
            </Pressable>
            {categories.map(cat => (
              <Pressable
                key={cat.id}
                style={[styles.catChip, selectedCategoryId === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setSelectedCategoryId(prev => prev === cat.id ? '' : cat.id)}
              >
                <Text style={[styles.catChipText, selectedCategoryId === cat.id && { color: '#fff' }]}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* 已選預覽列 */}
          {selectedItemIds.size > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedRow}>
              {allItems.filter(i => selectedItemIds.has(i.id)).map(item => {
                const uri = item.photoIds[0] ? getPhotoUri(item.photoIds[0]) : MISSING_URI;
                return (
                  <Pressable key={item.id} onPress={() => toggleItem(item.id)} style={styles.selectedThumbWrap}>
                    <Image source={{ uri }} style={styles.selectedThumb} resizeMode="cover" />
                    <View style={[styles.selectedThumbBadge, { backgroundColor: themeColor }]}>
                      <Text style={styles.selectedThumbX}>✕</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* 單品格 */}
          {filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>找不到符合的單品</Text>
          ) : (
            <View style={styles.itemGrid}>
              {filteredItems.map(item => {
                const checked = selectedItemIds.has(item.id);
                const uri = item.photoIds[0] ? getPhotoUri(item.photoIds[0]) : MISSING_URI;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.itemCell, checked && { borderColor: themeColor, borderWidth: 2 }]}
                    onPress={() => toggleItem(item.id)}
                  >
                    <Image source={{ uri }} style={styles.itemCellPhoto} resizeMode="cover" />
                    {checked && (
                      <View style={[styles.itemCheckOverlay, { backgroundColor: themeColor }]}>
                        <Text style={styles.itemCheckMark}>✓</Text>
                      </View>
                    )}
                    <Text style={styles.itemCellName} numberOfLines={1}>
                      {item.brand ? `${item.brand} ` : ''}{item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  headerBtn: { paddingHorizontal: 4 },
  headerBtnText: { fontSize: 15, color: '#fff' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: '#fff', margin: 12, marginBottom: 0,
    borderRadius: 12, padding: 14, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555' },
  dateInput: {
    height: 44, borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 8, paddingHorizontal: 12, fontSize: 15, color: '#333',
    backgroundColor: '#fafafa',
  },
  hint: { fontSize: 11, color: '#aaa' },
  catScroll: { marginBottom: 4 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5', marginRight: 6,
  },
  catChipText: { fontSize: 12, color: '#555' },
  emptyText: { color: '#ccc', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  selectedRow: { marginBottom: 4 },
  selectedThumbWrap: { marginRight: 8, position: 'relative' },
  selectedThumb: { width: 44, height: 58, borderRadius: 6, backgroundColor: '#e5e0d8' },
  selectedThumbBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedThumbX: { color: '#fff', fontSize: 9, fontWeight: '700' },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemCell: {
    width: ITEM_CELL_W, borderRadius: 8, overflow: 'hidden',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e4de',
  },
  itemCellPhoto: { width: ITEM_CELL_W, height: ITEM_CELL_H },
  itemCheckOverlay: {
    position: 'absolute', top: 5, right: 5,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  itemCheckMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemCellName: {
    fontSize: 10, color: '#444', paddingHorizontal: 4, paddingVertical: 3, textAlign: 'center',
  },
});
