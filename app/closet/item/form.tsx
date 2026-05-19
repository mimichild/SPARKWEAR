import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from '../../../src/db/context';
import type { Item, Season, Grade, Photo } from '../../../src/types';
import { saveItem, updateItem, getItemById } from '../../../src/services/itemService';
import { pickImages, savePhotos, deletePhotos } from '../../../src/services/photoService';
import { getCategories } from '../../../src/services/categoryService';
import { getOrigins } from '../../../src/services/categoryService';
import { getColors } from '../../../src/services/categoryService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { ProgressOverlay } from '../../../src/components/ui/ProgressOverlay';
import type { Category, Origin, Color } from '../../../src/types';
import { GRADES, SEASONS, PHOTO_MAX_FREE, PHOTO_MAX_PRO } from '../../../src/constants/defaults';

const TODAY = new Date().toISOString().slice(0, 10);

export default function ItemFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const { themeColor, isProUnlocked } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const isEdit = !!id;
  const photoLimit = isProUnlocked ? PHOTO_MAX_PRO : PHOTO_MAX_FREE;

  // Form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(TODAY);
  const [purchaseTime, setPurchaseTime] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [originId, setOriginId] = useState('');
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [grade, setGrade] = useState<Grade | ''>('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [size, setSize] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [suggestedWeight, setSuggestedWeight] = useState('');
  const [usageCount, setUsageCount] = useState('0');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [miniNote, setMiniNote] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [remark, setRemark] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<Set<string>>(new Set());

  // Options
  const [categories, setCategories] = useState<Category[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    Promise.all([getCategories(db), getOrigins(db), getColors(db)]).then(
      ([cats, origs, cols]) => { setCategories(cats); setOrigins(origs); setColors(cols); }
    );
  }, [db]);

  useEffect(() => {
    if (!id) return;
    getItemById(db, id).then(item => {
      if (!item) return;
      setName(item.name);
      setBrand(item.brand ?? '');
      setPurchaseDate(item.purchaseDate ?? TODAY);
      setPurchaseTime(item.purchaseTime ?? '');
      setCategoryId(item.categoryId ?? '');
      setOriginId(item.originId ?? '');
      setSelectedColorIds(item.colorIds);
      setGrade((item.grade ?? '') as Grade | '');
      setOriginalPrice(item.originalPrice?.toString() ?? '');
      setSpecialPrice(item.specialPrice?.toString() ?? '');
      setDiscountPrice(item.discountPrice?.toString() ?? '');
      setSize(item.size ?? '');
      setWeight(item.weight ?? '');
      setBodyType(item.bodyType ?? '');
      setSuggestedWeight(item.suggestedWeight ?? '');
      setUsageCount(item.usageCount.toString());
      setSeasons(item.seasons);
      setMiniNote(item.miniNote ?? '');
      setPros(item.pros ?? '');
      setCons(item.cons ?? '');
      setRemark(item.remark ?? '');
    });
  }, [id, db]);

  const toggleSeason = useCallback((s: Season) => {
    setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  const toggleColor = useCallback((colorId: string) => {
    setSelectedColorIds(prev =>
      prev.includes(colorId) ? prev.filter(x => x !== colorId) : [...prev, colorId]
    );
  }, []);

  const handlePickPhotos = useCallback(async () => {
    const currentCount = existingPhotos.filter(p => !removedPhotoIds.has(p.id)).length;
    const remaining = photoLimit - currentCount;
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
      setExistingPhotos(prev => [...prev, ...newPhotos]);
    } catch (e) {
      Alert.alert('照片上傳失敗', e instanceof Error ? e.message : '請確認儲存空間是否足夠');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  }, [existingPhotos, removedPhotoIds, photoLimit]);

  const handleRemovePhoto = useCallback((photoId: string) => {
    setRemovedPhotoIds(prev => new Set([...prev, photoId]));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('請輸入商品名稱');
      return;
    }
    setSaving(true);
    try {
      const photoIds = existingPhotos
        .filter(p => !removedPhotoIds.has(p.id))
        .map(p => p.path);  // store full file path for direct display

      const data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseTime: purchaseTime.trim() || undefined,
        categoryId: categoryId || undefined,
        originId: originId || undefined,
        colorIds: selectedColorIds,
        grade: grade || undefined,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        specialPrice: specialPrice ? parseFloat(specialPrice) : undefined,
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        size: size.trim() || undefined,
        weight: weight.trim() || undefined,
        bodyType: bodyType.trim() || undefined,
        suggestedWeight: suggestedWeight.trim() || undefined,
        usageCount: parseInt(usageCount) || 0,
        seasons,
        miniNote: miniNote.trim() || undefined,
        pros: pros.trim() || undefined,
        cons: cons.trim() || undefined,
        remark: remark.trim() || undefined,
        photoIds,
      };

      if (isEdit && id) {
        await updateItem(db, id, data);
        // Clean up removed photos
        const photosToDelete = existingPhotos.filter(p => removedPhotoIds.has(p.id));
        if (photosToDelete.length) await deletePhotos(photosToDelete);
      } else {
        await saveItem(db, data);
      }
      // router.replace ensures navigation works even without history (web direct URL)
      router.replace('/closet');
    } catch (e) {
      Alert.alert('儲存失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setSaving(false);
    }
  }, [
    name, brand, purchaseDate, purchaseTime, categoryId, originId,
    selectedColorIds, grade, originalPrice, specialPrice, discountPrice,
    size, weight, bodyType, suggestedWeight, usageCount, seasons,
    miniNote, pros, cons, remark, existingPhotos, removedPhotoIds,
    isEdit, id, db, router,
  ]);

  const visiblePhotos = existingPhotos.filter(p => !removedPhotoIds.has(p.id));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.canDismiss?.() ? router.dismiss() : router.replace('/closet')} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>取消</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? '編輯單品' : '記錄新品'}</Text>
        <Pressable onPress={handleSave} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, styles.saveText]}>儲存</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Field label="商品名稱 *">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="必填" />
          </Field>
          <Field label="品牌名稱">
            <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="選填" />
          </Field>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="購買日期">
                <TextInput style={styles.input} value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" />
              </Field>
            </View>
            <View style={styles.flex1}>
              <Field label="購買時間">
                <TextInput style={styles.input} value={purchaseTime} onChangeText={setPurchaseTime} placeholder="HH:mm" />
              </Field>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Field label="分類">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {categories.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[styles.chip, categoryId === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                >
                  <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Field>

          <Field label="來源">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {origins.map(o => (
                <Pressable
                  key={o.id}
                  style={[styles.chip, originId === o.id && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => setOriginId(o.id === originId ? '' : o.id)}
                >
                  <Text style={[styles.chipText, originId === o.id && styles.chipTextActive]}>{o.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Field>

          <Field label="顏色（可多選）">
            <View style={styles.chipWrap}>
              {colors.map(c => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, selectedColorIds.includes(c.id) && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => toggleColor(c.id)}
                >
                  <Text style={[styles.chipText, selectedColorIds.includes(c.id) && styles.chipTextActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="分級">
            <View style={styles.chipWrap}>
              {GRADES.map(g => (
                <Pressable
                  key={g}
                  style={[styles.chip, grade === g && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => setGrade(grade === g ? '' : g as Grade)}
                >
                  <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="原價"><TextInput style={styles.input} value={originalPrice} onChangeText={setOriginalPrice} keyboardType="numeric" placeholder="0" /></Field>
            </View>
            <View style={styles.flex1}>
              <Field label="特價"><TextInput style={styles.input} value={specialPrice} onChangeText={setSpecialPrice} keyboardType="numeric" placeholder="0" /></Field>
            </View>
            <View style={styles.flex1}>
              <Field label="優惠價"><TextInput style={styles.input} value={discountPrice} onChangeText={setDiscountPrice} keyboardType="numeric" placeholder="0" /></Field>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="尺寸"><TextInput style={styles.input} value={size} onChangeText={setSize} placeholder="S/M/23cm" /></Field>
            </View>
            <View style={styles.flex1}>
              <Field label="體重(kg)"><TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="48" /></Field>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="身材"><TextInput style={styles.input} value={bodyType} onChangeText={setBodyType} placeholder="梨形" /></Field>
            </View>
            <View style={styles.flex1}>
              <Field label="建議體重範圍"><TextInput style={styles.input} value={suggestedWeight} onChangeText={setSuggestedWeight} placeholder="45-52" /></Field>
            </View>
          </View>
          <Field label="使用次數">
            <TextInput style={styles.input} value={usageCount} onChangeText={setUsageCount} keyboardType="numeric" placeholder="0" />
          </Field>
        </View>

        <View style={styles.section}>
          <Field label="季節（可多選）">
            <View style={styles.chipWrap}>
              {SEASONS.map(s => (
                <Pressable
                  key={s}
                  style={[styles.chip, seasons.includes(s) && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => toggleSeason(s)}
                >
                  <Text style={[styles.chipText, seasons.includes(s) && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="小紀錄"><TextInput style={[styles.input, styles.textarea]} value={miniNote} onChangeText={setMiniNote} multiline placeholder="任何想法..." /></Field>
          <Field label="優點"><TextInput style={[styles.input, styles.textarea]} value={pros} onChangeText={setPros} multiline /></Field>
          <Field label="缺點"><TextInput style={[styles.input, styles.textarea]} value={cons} onChangeText={setCons} multiline /></Field>
          <Field label="備註"><TextInput style={[styles.input, styles.textarea]} value={remark} onChangeText={setRemark} multiline /></Field>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>商品照片（第一張為首圖，最多 {photoLimit} 張）</Text>
          <View style={styles.photoRow}>
            {visiblePhotos.map(p => (
              <Pressable key={p.id} style={styles.photoThumb} onLongPress={() => handleRemovePhoto(p.id)}>
                <Text style={styles.photoPlaceholder}>📷</Text>
              </Pressable>
            ))}
            {visiblePhotos.length < photoLimit && (
              <Pressable style={[styles.addPhotoBtn, { borderColor: themeColor }]} onPress={handlePickPhotos}>
                <Text style={[styles.addPhotoText, { color: themeColor }]}>+</Text>
              </Pressable>
            )}
          </View>
          {visiblePhotos.length > 0 && (
            <Text style={styles.photoHint}>長按照片可刪除</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  headerBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  saveText: { fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  field: { gap: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: '500' },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  textarea: { height: 72, paddingTop: 8, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  chipScroll: { marginTop: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    marginRight: 6,
    marginBottom: 2,
  },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: {
    width: 72,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: { fontSize: 24 },
  addPhotoBtn: {
    width: 72,
    height: 96,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { fontSize: 32, fontWeight: '300' },
  photoHint: { fontSize: 11, color: '#bbb', marginTop: 4 },
});
