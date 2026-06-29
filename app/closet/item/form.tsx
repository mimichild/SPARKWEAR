import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, Alert, Modal, FlatList, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from '../../../src/db/context';
import type { Item, Season, Grade, Photo, Category, Origin, Color } from '../../../src/types';
import { saveItem, updateItem, getItemById } from '../../../src/services/itemService';
import { pickImages, savePhotos, deletePhotos, getPhotoUri } from '../../../src/services/photoService';
import {
  getCategories, addCategory, deleteCategory,
  getOrigins, addOrigin, deleteOrigin,
  getColors, addColor, deleteColor,
} from '../../../src/services/categoryService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { ProgressOverlay } from '../../../src/components/ui/ProgressOverlay';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import { PhotoEditorModal, type EditablePhoto } from '../../../src/components/items/PhotoEditorModal';
import { GRADES, SEASONS, PHOTO_MAX_FREE, PHOTO_MAX_PRO } from '../../../src/constants/defaults';

const TODAY = new Date().toISOString().slice(0, 10);

const CAT_PALETTE = [
  '#f48fb1','#ce93d8','#90caf9','#a5d6a7','#80cbc4',
  '#ffe082','#bcaaa4','#ef9a9a','#b0bec5','#c5cae9',
];

type PickerType = 'category' | 'origin' | 'color' | null;
type EditType  = 'category' | 'origin' | 'color' | null;

export default function ItemFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const { themeColor, isProUnlocked } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const isEdit = !!id;
  const photoLimit = isProUnlocked ? PHOTO_MAX_PRO : PHOTO_MAX_FREE;

  const scrollRef = useRef<ScrollView>(null);
  const textSectionY = useRef(0);
  const consYInSection = useRef(0);
  const remarkYInSection = useRef(0);

  const scrollToAbsoluteY = useCallback((fieldYInSection: React.MutableRefObject<number>) => {
    setTimeout(() => {
      const y = textSectionY.current + fieldYInSection.current;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    }, 400);
  }, []);

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
  const [existingUsageCount, setExistingUsageCount] = useState(0);
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

  // Photo editor
  const [editorPhotos, setEditorPhotos] = useState<EditablePhoto[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  // Picker / Edit modal
  const [pickerType, setPickerType] = useState<PickerType>(null);
  const [editType, setEditType] = useState<EditType>(null);
  const [editNewName, setEditNewName] = useState('');
  const [editAdding, setEditAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const reloadOptions = useCallback(async () => {
    const [cats, origs, cols] = await Promise.all([getCategories(db), getOrigins(db), getColors(db)]);
    setCategories(cats);
    setOrigins(origs);
    setColors(cols);
  }, [db]);

  useEffect(() => { reloadOptions(); }, [reloadOptions]);

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
      setExistingUsageCount(item.usageCount);
      setSeasons(item.seasons);
      setMiniNote(item.miniNote ?? '');
      setPros(item.pros ?? '');
      setCons(item.cons ?? '');
      setRemark(item.remark ?? '');
      getItemById(db, id).then(() => {});
    });
    // Load photos
    getItemById(db, id).then(item => {
      if (item?.photoIds?.length) {
        const photos: Photo[] = item.photoIds.map(path => ({
          id: path, path, mimeType: 'image/jpeg', createdAt: '',
        }));
        setExistingPhotos(photos);
      }
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
    if (remaining <= 0) { Alert.alert('照片已達上限', `最多 ${photoLimit} 張`); return; }
    const picked = await pickImages(remaining);
    if (!picked.length) return;
    // 開啟照片編輯器讓使用者逐張預覽/調整
    setEditorPhotos(picked.map(p => ({ uri: p.uri, width: p.width, height: p.height })));
    setEditorVisible(true);
  }, [existingPhotos, removedPhotoIds, photoLimit]);

  const handleEditorComplete = useCallback(async (editedUris: string[]) => {
    setEditorVisible(false);
    setSaving(true); setProgress(0);
    try {
      const newPhotos = await savePhotos(editedUris, 'grid', (d, t) => setProgress(d / t));
      setExistingPhotos(prev => [...prev, ...newPhotos]);
    } catch (e) {
      Alert.alert('照片儲存失敗', e instanceof Error ? e.message : '請確認儲存空間');
    } finally { setSaving(false); setProgress(0); }
  }, []);

  const handleRemovePhoto = useCallback((photoId: string) => {
    setRemovedPhotoIds(prev => new Set([...prev, photoId]));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { Alert.alert('請輸入商品名稱'); return; }
    setSaving(true);
    try {
      const photoIds = existingPhotos.filter(p => !removedPhotoIds.has(p.id)).map(p => p.path);
      const data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(), brand: brand.trim() || undefined,
        purchaseDate: purchaseDate || undefined, purchaseTime: purchaseTime.trim() || undefined,
        categoryId: categoryId || undefined, originId: originId || undefined,
        colorIds: selectedColorIds, grade: grade || undefined,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        specialPrice: specialPrice ? parseFloat(specialPrice) : undefined,
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        size: size.trim() || undefined, weight: weight.trim() || undefined,
        bodyType: bodyType.trim() || undefined, suggestedWeight: suggestedWeight.trim() || undefined,
        usageCount: isEdit ? existingUsageCount : 0, seasons,
        miniNote: miniNote.trim() || undefined, pros: pros.trim() || undefined,
        cons: cons.trim() || undefined, remark: remark.trim() || undefined,
        photoIds,
      };
      if (isEdit && id) {
        await updateItem(db, id, data);
        const toDelete = existingPhotos.filter(p => removedPhotoIds.has(p.id));
        if (toDelete.length) await deletePhotos(toDelete);
      } else {
        await saveItem(db, data);
      }
      router.replace('/closet');
    } catch (e) {
      Alert.alert('儲存失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally { setSaving(false); }
  }, [
    name, brand, purchaseDate, purchaseTime, categoryId, originId,
    selectedColorIds, grade, originalPrice, specialPrice, discountPrice,
    size, weight, bodyType, suggestedWeight, existingUsageCount, seasons,
    miniNote, pros, cons, remark, existingPhotos, removedPhotoIds,
    isEdit, id, db, router,
  ]);

  // ── 編輯選項 ──────────────────────────────────────────────────
  const handleAddOption = useCallback(async () => {
    const trimmed = editNewName.trim();
    if (!trimmed) return;
    setEditAdding(true);
    try {
      if (editType === 'category') {
        const color = CAT_PALETTE[categories.length % CAT_PALETTE.length];
        await addCategory(db, trimmed, color);
      } else if (editType === 'origin') {
        await addOrigin(db, trimmed);
      } else if (editType === 'color') {
        await addColor(db, trimmed);
      }
      setEditNewName('');
      await reloadOptions();
    } finally { setEditAdding(false); }
  }, [editType, editNewName, categories.length, db, reloadOptions]);

  const handleDeleteOption = useCallback(async (optId: string) => {
    if (editType === 'category') {
      await deleteCategory(db, optId);
      if (categoryId === optId) setCategoryId('');
    } else if (editType === 'origin') {
      await deleteOrigin(db, optId);
      if (originId === optId) setOriginId('');
    } else if (editType === 'color') {
      await deleteColor(db, optId);
      setSelectedColorIds(prev => prev.filter(c => c !== optId));
    }
    setDeleteConfirmId(null);
    await reloadOptions();
  }, [editType, categoryId, originId, db, reloadOptions]);

  const visiblePhotos = existingPhotos.filter(p => !removedPhotoIds.has(p.id));

  // ── 顯示文字 ──────────────────────────────────────────────────
  const catName = categories.find(c => c.id === categoryId)?.name ?? '';
  const originName = origins.find(o => o.id === originId)?.name ?? '';
  const colorSummary = selectedColorIds.length === 0
    ? ''
    : selectedColorIds.map(cid => colors.find(c => c.id === cid)?.name ?? '').filter(Boolean).join('、');

  const editOptions = editType === 'category' ? categories
    : editType === 'origin' ? origins
    : editType === 'color' ? colors : [];
  const editTitle = editType === 'category' ? '編輯分類' : editType === 'origin' ? '編輯來源' : '編輯顏色';
  const deleteOptionName = editType === 'category'
    ? categories.find(c => c.id === deleteConfirmId)?.name
    : editType === 'origin'
    ? origins.find(o => o.id === deleteConfirmId)?.name
    : colors.find(c => c.id === deleteConfirmId)?.name;

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView ref={scrollRef} style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 基本資訊 */}
        <View style={styles.section}>
          <Field label="品牌名稱">
            <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="選填" />
          </Field>
          <Field label="商品名稱 *">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="必填" />
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

        {/* 下拉選單區 */}
        <View style={styles.section}>
          {/* 分類 */}
          <View style={styles.dropdownField}>
            <Text style={styles.label}>分類</Text>
            <View style={styles.dropdownRow}>
              <Pressable style={styles.dropdown} onPress={() => setPickerType('category')}>
                <Text style={[styles.dropdownText, !catName && styles.dropdownPlaceholder]}>
                  {catName || '請選擇分類'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </Pressable>
              <Pressable style={styles.editOptBtn} onPress={() => { setEditType('category'); setEditNewName(''); }}>
                <Text style={[styles.editOptText, { color: themeColor }]}>編輯</Text>
              </Pressable>
            </View>
          </View>

          {/* 來源 */}
          <View style={styles.dropdownField}>
            <Text style={styles.label}>來源</Text>
            <View style={styles.dropdownRow}>
              <Pressable style={styles.dropdown} onPress={() => setPickerType('origin')}>
                <Text style={[styles.dropdownText, !originName && styles.dropdownPlaceholder]}>
                  {originName || '請選擇來源'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </Pressable>
              <Pressable style={styles.editOptBtn} onPress={() => { setEditType('origin'); setEditNewName(''); }}>
                <Text style={[styles.editOptText, { color: themeColor }]}>編輯</Text>
              </Pressable>
            </View>
          </View>

          {/* 顏色 */}
          <View style={styles.dropdownField}>
            <Text style={styles.label}>顏色（可多選）</Text>
            <View style={styles.dropdownRow}>
              <Pressable style={styles.dropdown} onPress={() => setPickerType('color')}>
                <Text style={[styles.dropdownText, !colorSummary && styles.dropdownPlaceholder]} numberOfLines={1}>
                  {colorSummary || '請選擇顏色'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </Pressable>
              <Pressable style={styles.editOptBtn} onPress={() => { setEditType('color'); setEditNewName(''); }}>
                <Text style={[styles.editOptText, { color: themeColor }]}>編輯</Text>
              </Pressable>
            </View>
          </View>

          {/* 季節 */}
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

          {/* 分級 */}
          <Field label="分級">
            <View style={styles.chipWrap}>
              {GRADES.map(g => (
                <Pressable
                  key={g}
                  style={[styles.chip, grade === g && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => setGrade(grade === g ? '' : g as Grade)}
                >
                  <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>{g}級</Text>
                </Pressable>
              ))}
            </View>
          </Field>
        </View>

        {/* 價格 / 尺寸 */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.flex1}><Field label="原價"><TextInput style={styles.input} value={originalPrice} onChangeText={setOriginalPrice} keyboardType="numeric" placeholder="0" /></Field></View>
            <View style={styles.flex1}><Field label="特價"><TextInput style={styles.input} value={specialPrice} onChangeText={setSpecialPrice} keyboardType="numeric" placeholder="0" /></Field></View>
            <View style={styles.flex1}><Field label="優惠價"><TextInput style={styles.input} value={discountPrice} onChangeText={setDiscountPrice} keyboardType="numeric" placeholder="0" /></Field></View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}><Field label="尺寸"><TextInput style={styles.input} value={size} onChangeText={setSize} placeholder="S/M/23cm" /></Field></View>
            <View style={styles.flex1}><Field label="體重(kg)"><TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="48" /></Field></View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}><Field label="身材"><TextInput style={styles.input} value={bodyType} onChangeText={setBodyType} placeholder="梨形" /></Field></View>
            <View style={styles.flex1}><Field label="建議體重範圍"><TextInput style={styles.input} value={suggestedWeight} onChangeText={setSuggestedWeight} placeholder="45-52" /></Field></View>
          </View>
        </View>

        {/* 文字欄位 */}
        <View style={styles.section} onLayout={(e) => { textSectionY.current = e.nativeEvent.layout.y; }}>
          <Field label="小紀錄"><TextInput style={[styles.input, styles.textarea]} value={miniNote} onChangeText={setMiniNote} multiline placeholder="任何想法..." /></Field>
          <Field label="優點"><TextInput style={[styles.input, styles.textarea]} value={pros} onChangeText={setPros} multiline /></Field>
          <View onLayout={(e) => { consYInSection.current = e.nativeEvent.layout.y; }}>
            <Field label="缺點"><TextInput style={[styles.input, styles.textarea]} value={cons} onChangeText={setCons} multiline onFocus={() => scrollToAbsoluteY(consYInSection)} /></Field>
          </View>
          <View onLayout={(e) => { remarkYInSection.current = e.nativeEvent.layout.y; }}>
            <Field label="備註"><TextInput style={[styles.input, styles.textarea]} value={remark} onChangeText={setRemark} multiline onFocus={() => scrollToAbsoluteY(remarkYInSection)} /></Field>
          </View>
        </View>

        {/* 照片 */}
        <View style={styles.section}>
          <View style={styles.photoHeader}>
            <Text style={styles.sectionLabel}>商品照片（第一張為首圖，最多 {photoLimit} 張）</Text>
            {visiblePhotos.length > 1 && (
              <Pressable onPress={() => setReorderMode(r => !r)}>
                <Text style={[styles.reorderToggle, { color: themeColor }]}>
                  {reorderMode ? '完成排序' : '調整順序'}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.photoRow}>
            {visiblePhotos.map((p, idx) => (
              <View key={p.id} style={styles.photoThumbWrap}>
                <Pressable style={styles.photoThumb} onLongPress={() => !reorderMode && handleRemovePhoto(p.id)}>
                  <Image source={{ uri: getPhotoUri(p.path) }} style={styles.photoImg} resizeMode="cover" />
                  {idx === 0 && <View style={[styles.coverBadge, { backgroundColor: themeColor }]}><Text style={styles.coverBadgeTxt}>首圖</Text></View>}
                </Pressable>

                {reorderMode && (
                  <View style={styles.reorderBtns}>
                    <Pressable
                      disabled={idx === 0}
                      onPress={() => {
                        const next = [...existingPhotos.filter(x => !removedPhotoIds.has(x.id))];
                        const all = [...existingPhotos];
                        const ai = all.indexOf(p);
                        if (ai > 0) {
                          [all[ai - 1], all[ai]] = [all[ai], all[ai - 1]];
                          setExistingPhotos(all);
                        }
                        void next;
                      }}
                    >
                      <Text style={[styles.reorderArrow, idx === 0 && { color: '#ccc' }]}>←</Text>
                    </Pressable>
                    <Pressable
                      disabled={idx === visiblePhotos.length - 1}
                      onPress={() => {
                        const all = [...existingPhotos];
                        const ai = all.indexOf(p);
                        if (ai < all.length - 1) {
                          [all[ai], all[ai + 1]] = [all[ai + 1], all[ai]];
                          setExistingPhotos(all);
                        }
                      }}
                    >
                      <Text style={[styles.reorderArrow, idx === visiblePhotos.length - 1 && { color: '#ccc' }]}>→</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRemovePhoto(p.id)}>
                      <Text style={styles.reorderDel}>✕</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            {visiblePhotos.length < photoLimit && !reorderMode && (
              <Pressable style={[styles.addPhotoBtn, { borderColor: themeColor }]} onPress={handlePickPhotos}>
                <Text style={[styles.addPhotoText, { color: themeColor }]}>+</Text>
              </Pressable>
            )}
          </View>
          {visiblePhotos.length > 0 && !reorderMode && <Text style={styles.photoHint}>長按照片可刪除</Text>}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── 選擇 Modal ── */}
      <Modal visible={pickerType !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {pickerType === 'category' ? '選擇分類' : pickerType === 'origin' ? '選擇來源' : '選擇顏色'}
            </Text>
            <Pressable onPress={() => setPickerType(null)} style={styles.modalClose}>
              <Text style={[styles.modalCloseTxt, { color: themeColor }]}>完成</Text>
            </Pressable>
          </View>
          <FlatList
            data={pickerType === 'category' ? categories : pickerType === 'origin' ? origins : colors}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const isSelected = pickerType === 'category'
                ? categoryId === item.id
                : pickerType === 'origin'
                ? originId === item.id
                : selectedColorIds.includes(item.id);
              return (
                <Pressable
                  style={[styles.pickerRow, isSelected && { backgroundColor: `${themeColor}18` }]}
                  onPress={() => {
                    if (pickerType === 'category') setCategoryId(isSelected ? '' : item.id);
                    else if (pickerType === 'origin') setOriginId(isSelected ? '' : item.id);
                    else toggleColor(item.id);
                  }}
                >
                  <Text style={[styles.pickerText, isSelected && { color: themeColor, fontWeight: '600' }]}>
                    {item.name}
                  </Text>
                  {isSelected && <Text style={[styles.pickerCheck, { color: themeColor }]}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* ── 編輯選項 Modal ── */}
      <Modal visible={editType !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editTitle}</Text>
            <Pressable onPress={() => setEditType(null)} style={styles.modalClose}>
              <Text style={[styles.modalCloseTxt, { color: themeColor }]}>完成</Text>
            </Pressable>
          </View>
          <FlatList
            data={editOptions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.editRow}>
                <Text style={styles.editOptName}>{item.name}</Text>
                <Pressable style={styles.deleteOptBtn} onPress={() => setDeleteConfirmId(item.id)}>
                  <Text style={styles.deleteOptTxt}>刪除</Text>
                </Pressable>
              </View>
            )}
            ListFooterComponent={() => (
              <View style={styles.addOptRow}>
                <TextInput
                  style={styles.addOptInput}
                  value={editNewName}
                  onChangeText={setEditNewName}
                  placeholder="新增名稱"
                  returnKeyType="done"
                  onSubmitEditing={handleAddOption}
                />
                <Pressable
                  onPress={handleAddOption}
                  disabled={editAdding || !editNewName.trim()}
                  style={[styles.addOptBtn, { backgroundColor: themeColor }, (!editNewName.trim() || editAdding) && { opacity: 0.4 }]}
                >
                  <Text style={styles.addOptBtnTxt}>新增</Text>
                </Pressable>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      <PhotoEditorModal
        photos={editorPhotos}
        visible={editorVisible}
        themeColor={themeColor}
        onComplete={handleEditorComplete}
        onCancel={() => setEditorVisible(false)}
      />

      <ConfirmDialog
        visible={!!deleteConfirmId}
        title="刪除選項"
        message={`確定刪除「${deleteOptionName ?? ''}」？`}
        confirmLabel="刪除"
        danger
        onConfirm={() => deleteConfirmId && handleDeleteOption(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

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
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  headerBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  saveText: { fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: '#fff', marginTop: 12,
    marginHorizontal: 12, borderRadius: 12, padding: 14, gap: 12,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  field: { gap: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: '500' },
  input: {
    height: 40, borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 8, paddingHorizontal: 10, fontSize: 14,
    color: '#333', backgroundColor: '#fafafa',
  },
  textarea: { height: 72, paddingTop: 8, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },

  // Dropdown
  dropdownField: { gap: 4 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdown: {
    flex: 1, height: 40, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 10, backgroundColor: '#fafafa',
  },
  dropdownText: { flex: 1, fontSize: 14, color: '#333' },
  dropdownPlaceholder: { color: '#bbb' },
  chevron: { fontSize: 10, color: '#aaa' },
  editOptBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#eee',
  },
  editOptText: { fontSize: 13, fontWeight: '500' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5',
    marginRight: 6, marginBottom: 2,
  },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Photos
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reorderToggle: { fontSize: 13, fontWeight: '500' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumbWrap: { alignItems: 'center' },
  photoThumb: { width: 72, height: 96, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee' },
  photoImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingVertical: 2,
  },
  coverBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '600' },
  reorderBtns: { flexDirection: 'row', gap: 6, marginTop: 4 },
  reorderArrow: { fontSize: 16, color: '#555' },
  reorderDel: { fontSize: 14, color: '#e57373' },
  addPhotoBtn: {
    width: 72, height: 96, borderRadius: 8,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoText: { fontSize: 32, fontWeight: '300' },
  photoHint: { fontSize: 11, color: '#bbb', marginTop: 4 },

  // Picker / Edit Modal
  modal: { flex: 1, backgroundColor: '#faf9f7' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  modalClose: { padding: 4 },
  modalCloseTxt: { fontSize: 15, fontWeight: '600' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0ede8',
    backgroundColor: '#fff',
  },
  pickerText: { fontSize: 15, color: '#333' },
  pickerCheck: { fontSize: 16, fontWeight: '700' },

  editRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0ede8',
    backgroundColor: '#fff',
  },
  editOptName: { flex: 1, fontSize: 15, color: '#222' },
  deleteOptBtn: {
    borderWidth: 1, borderColor: '#e57373', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  deleteOptTxt: { fontSize: 13, color: '#e57373' },
  addOptRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10,
  },
  addOptInput: {
    flex: 1, borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fafafa',
  },
  addOptBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  addOptBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
