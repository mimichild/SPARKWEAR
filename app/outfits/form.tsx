import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, SafeAreaView, Alert, Platform, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from '../../src/db/context';
import { saveOutfit, updateOutfit, getOutfitById } from '../../src/services/outfitService';
import { getItems, filterItems } from '../../src/services/itemService';
import { getCategories } from '../../src/services/categoryService';
import { pickImages, savePhotos, deletePhotos } from '../../src/services/photoService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { ProgressOverlay } from '../../src/components/ui/ProgressOverlay';
import { SearchBar } from '../../src/components/shared/SearchBar';
import type { Outfit, Item, Photo, Category } from '../../src/types';
import { PHOTO_MAX_FREE, PHOTO_MAX_PRO } from '../../src/constants/defaults';

const TODAY = new Date().toISOString().slice(0, 10);

export default function OutfitFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const { themeColor, isProUnlocked } = useSettingsStore();
  const isEdit = !!id;
  const photoLimit = isProUnlocked ? PHOTO_MAX_PRO : PHOTO_MAX_FREE;

  // Form state
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState('');
  const [weather, setWeather] = useState('');
  const [temperature, setTemperature] = useState('');
  const [county, setCounty] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Item picker state
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemQuery, setItemQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    Promise.all([getItems(db), getCategories(db)]).then(([items, cats]) => {
      setAllItems(items);
      setCategories(cats);
    });
  }, [db]);

  useEffect(() => {
    if (!id) return;
    getOutfitById(db, id).then(outfit => {
      if (!outfit) return;
      setDate(outfit.date);
      setTime(outfit.time ?? '');
      setWeather(outfit.weather ?? '');
      setTemperature(outfit.temperature ?? '');
      setCounty(outfit.county ?? '');
      setPlace(outfit.place ?? '');
      setNote(outfit.note ?? '');
      setSelectedItemIds(new Set(outfit.itemIds));
    });
  }, [id, db]);

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

  const handlePickPhotos = useCallback(async () => {
    const visibleCount = photos.filter(p => !removedPhotoIds.has(p.id)).length;
    const remaining = photoLimit - visibleCount;
    if (remaining <= 0) {
      Alert.alert('照片已達上限', `最多可新增 ${photoLimit} 張照片`);
      return;
    }
    const picked = await pickImages(remaining);
    if (!picked.length) return;

    setSaving(true);
    setProgress(0);
    try {
      const newPhotos = await savePhotos(
        picked.map(p => p.uri),
        'grid',
        (done, total) => setProgress(done / total)
      );
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (e) {
      Alert.alert('照片上傳失敗', e instanceof Error ? e.message : '請確認儲存空間是否足夠');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  }, [photos, removedPhotoIds, photoLimit]);

  const handleSave = useCallback(async () => {
    if (!date) {
      Alert.alert('請選擇日期');
      return;
    }
    setSaving(true);
    try {
      const photoIds = photos.filter(p => !removedPhotoIds.has(p.id)).map(p => p.path);
      const data: Omit<Outfit, 'id' | 'createdAt' | 'updatedAt'> = {
        date,
        time: time.trim() || undefined,
        weather: weather.trim() || undefined,
        temperature: temperature.trim() || undefined,
        county: county.trim() || undefined,
        place: place.trim() || undefined,
        note: note.trim() || undefined,
        photoIds,
        itemIds: Array.from(selectedItemIds),
      };

      if (isEdit && id) {
        await updateOutfit(db, id, data);
        const removed = photos.filter(p => removedPhotoIds.has(p.id));
        if (removed.length) await deletePhotos(removed);
      } else {
        await saveOutfit(db, data);
      }
      router.back();
    } catch (e) {
      Alert.alert('儲存失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setSaving(false);
    }
  }, [date, time, weather, temperature, county, place, note,
      photos, removedPhotoIds, selectedItemIds, isEdit, id, db, router]);

  const visiblePhotos = photos.filter(p => !removedPhotoIds.has(p.id));
  const catName = (cid: string) => categories.find(c => c.id === cid)?.name ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>取消</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? '編輯穿搭' : '新增穿搭'}</Text>
        <Pressable onPress={handleSave} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { fontWeight: '700' }]}>儲存</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* 基本資訊 */}
        <View style={styles.section}>
          <Field label="日期 *">
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          </Field>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="時間">
                <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="HH:mm" />
              </Field>
            </View>
            <View style={styles.flex1}>
              <Field label="天氣">
                <TextInput style={styles.input} value={weather} onChangeText={setWeather} placeholder="晴天 24°C" />
              </Field>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="氣溫">
                <TextInput style={styles.input} value={temperature} onChangeText={setTemperature} placeholder="24°C" />
              </Field>
            </View>
            <View style={styles.flex1}>
              <Field label="縣市">
                <TextInput style={styles.input} value={county} onChangeText={setCounty} placeholder="台北市" />
              </Field>
            </View>
          </View>
          <Field label="地點">
            <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="信義區" />
          </Field>
          <Field label="穿搭想法">
            <TextInput
              style={[styles.input, styles.textarea]}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="今天的穿搭感想..."
            />
          </Field>
        </View>

        {/* 照片 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>穿搭照片（最多 {photoLimit} 張）</Text>
          <View style={styles.photoRow}>
            {visiblePhotos.map(p => (
              <Pressable
                key={p.id}
                style={styles.photoThumb}
                onLongPress={() => setRemovedPhotoIds(prev => new Set([...prev, p.id]))}
              >
                <Text style={styles.photoEmoji}>📷</Text>
              </Pressable>
            ))}
            {visiblePhotos.length < photoLimit && (
              <Pressable style={[styles.addPhotoBtn, { borderColor: themeColor }]} onPress={handlePickPhotos}>
                <Text style={[styles.addPhotoText, { color: themeColor }]}>+</Text>
              </Pressable>
            )}
          </View>
          {visiblePhotos.length > 0 && (
            <Text style={styles.hint}>長按照片可刪除</Text>
          )}
        </View>

        {/* 搭配單品選取 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            搭配單品（已選 {selectedItemIds.size} 件）
          </Text>

          <SearchBar
            value={itemQuery}
            onChangeText={setItemQuery}
            placeholder="搜尋品牌或名稱..."
          />

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

          {/* 單品列表 */}
          {filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>找不到符合的單品</Text>
          ) : (
            filteredItems.map(item => {
              const checked = selectedItemIds.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[styles.itemRow, checked && { backgroundColor: `${themeColor}18` }]}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={[styles.itemCheckbox, checked && { backgroundColor: themeColor, borderColor: themeColor }]}>
                    {checked && <Text style={styles.itemCheck}>✓</Text>}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
                    {item.categoryId && <Text style={styles.itemCat}>{catName(item.categoryId)}</Text>}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ProgressOverlay
        visible={saving}
        title={isEdit ? '更新中...' : '儲存中...'}
        progress={progress > 0 ? progress : undefined}
      />
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerBtn: { paddingHorizontal: 4 },
  headerBtnText: { fontSize: 15, color: '#fff' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: '#fff', margin: 12, marginBottom: 0,
    borderRadius: 12, padding: 14, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555' },
  field: { gap: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: '500' },
  input: {
    height: 40, borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 8, paddingHorizontal: 10, fontSize: 14, color: '#333',
    backgroundColor: '#fafafa',
  },
  textarea: { height: 72, paddingTop: 8, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: {
    width: 72, height: 96, borderRadius: 8, backgroundColor: '#eee',
    alignItems: 'center', justifyContent: 'center',
  },
  photoEmoji: { fontSize: 24 },
  addPhotoBtn: {
    width: 72, height: 96, borderRadius: 8,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoText: { fontSize: 32, fontWeight: '300' },
  hint: { fontSize: 11, color: '#bbb' },
  catScroll: { marginBottom: 4 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5',
    marginRight: 6,
  },
  catChipText: { fontSize: 12, color: '#555' },
  emptyText: { color: '#ccc', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  itemCheckbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#ccc', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  itemCheck: { fontSize: 12, color: '#fff', fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#333' },
  itemBrand: { fontSize: 12, color: '#888', marginTop: 1 },
  itemCat: { fontSize: 11, color: '#bbb', marginTop: 1 },
});
