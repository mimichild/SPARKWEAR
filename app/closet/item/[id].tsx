import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from '../../../src/db/context';
import { getItemById, deleteItem, incrementUsageCount } from '../../../src/services/itemService';
import { getCategories, getOrigins, getColors } from '../../../src/services/categoryService';
import { getPhotoUri, deletePhotos } from '../../../src/services/photoService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { Item, Category, Origin, Color, Photo } from '../../../src/types';

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>'
  );

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<Item | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getItemById(db, id),
      getCategories(db),
      getOrigins(db),
      getColors(db),
    ]).then(([item, cats, origs, cols]) => {
      setItem(item);
      setCategories(cats);
      setOrigins(origs);
      setColors(cols);
    });
  }, [id, db]);

  const handleDelete = async () => {
    if (!item) return;
    // Delete photo files before removing DB record
    if (item.photoIds.length > 0) {
      const photoObjects = item.photoIds.map(path => ({
        id: path, path, mimeType: 'image/jpeg', createdAt: '',
      } as Photo));
      await deletePhotos(photoObjects);
    }
    await deleteItem(db, item.id);
    router.back();
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Text style={styles.loading}>載入中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const catName = categories.find(c => c.id === item.categoryId)?.name ?? '';
  const originName = origins.find(o => o.id === item.originId)?.name ?? '';
  const colorNames = item.colorIds
    .map(cid => colors.find(c => c.id === cid)?.name)
    .filter(Boolean)
    .join('、');
  const photos = item.photoIds;
  const coverUri = photos.length > 0 ? getPhotoUri(photos[0]) : MISSING_URI;

  const detailsData = [
    { label: '品牌',    value: item.brand,                                    visible: !!item.brand },
    { label: '購買日期', value: item.purchaseDate,                              visible: !!item.purchaseDate },
    { label: '分類',    value: catName,                                        visible: !!catName },
    { label: '來源',    value: originName,                                     visible: !!originName },
    { label: '顏色',    value: colorNames,                                     visible: !!colorNames },
    { label: '分級',    value: item.grade,                                     visible: !!item.grade },
    { label: '尺寸',    value: item.size,                                      visible: !!item.size },
    { label: '原價',    value: item.originalPrice  != null ? `$${item.originalPrice}`  : '', visible: item.originalPrice  != null },
    { label: '特價',    value: item.specialPrice   != null ? `$${item.specialPrice}`   : '', visible: item.specialPrice   != null },
    { label: '優惠價',  value: item.discountPrice  != null ? `$${item.discountPrice}`  : '', visible: item.discountPrice  != null },
    { label: '體重',    value: item.weight ? `${item.weight} kg` : '',         visible: !!item.weight },
    { label: '身材',    value: item.bodyType,                                  visible: !!item.bodyType },
    { label: '建議體重', value: item.suggestedWeight,                           visible: !!item.suggestedWeight },
    { label: '使用次數', value: `${item.usageCount} 次`, visible: true, isUsage: true },
    { label: '季節',    value: item.seasons.join('、'),                        visible: item.seasons.length > 0 },
    { label: '小紀錄',  value: item.miniNote,   visible: !!item.miniNote,  multiline: true },
    { label: '優點',    value: item.pros,       visible: !!item.pros,      multiline: true },
    { label: '缺點',    value: item.cons,       visible: !!item.cons,      multiline: true },
    { label: '備註',    value: item.remark,     visible: !!item.remark,    multiline: true },
  ].filter(d => d.visible) as { label: string; value: string; multiline?: boolean; isUsage?: boolean }[];

  const handleIncrementUsage = async () => {
    if (!item) return;
    await incrementUsageCount(db, item.id);
    // 重新載入單品資料以反映最新次數
    const updated = await getItemById(db, item.id);
    if (updated) setItem(updated);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>我的衣櫃</Text>
      </View>

      <FlatList
        data={detailsData}
        keyExtractor={(_item, index) => index.toString()}
        ListHeaderComponent={() => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              {catName && <Text style={styles.itemCategory}>{catName}</Text>}
            </View>
            <Image
              source={{ uri: coverUri }}
              style={styles.itemPhoto}
              resizeMode="cover"
            />
          </View>
        )}
        renderItem={({ item: detail }) => (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{detail.label}</Text>
            {detail.isUsage ? (
              <View style={styles.usageRow}>
                <Text style={styles.rowValue}>{detail.value}</Text>
                <Pressable
                  onPress={handleIncrementUsage}
                  style={[styles.usageBtn, { backgroundColor: themeColor }]}
                >
                  <Text style={styles.usageBtnText}>+1</Text>
                </Pressable>
              </View>
            ) : (
              <Text
                style={[styles.rowValue, detail.multiline && styles.rowMultiline]}
                numberOfLines={detail.multiline ? undefined : 1}
              >
                {detail.value}
              </Text>
            )}
          </View>
        )}
        ListFooterComponent={() => (
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(`/closet/item/form?id=${item.id}`)}
              style={[styles.actionBtn, { borderColor: themeColor }]}
            >
              <Text style={[styles.actionBtnText, { color: themeColor }]}>編輯</Text>
            </Pressable>
            <Pressable
              onPress={() => setDeleteVisible(true)}
              style={[styles.actionBtn, styles.deleteBtn]}
            >
              <Text style={[styles.actionBtnText, styles.deleteBtnText]}>刪除</Text>
            </Pressable>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <ConfirmDialog
        visible={deleteVisible}
        title="確認刪除"
        message={`確定要刪除「${item.name}」嗎？此操作無法復原。`}
        confirmLabel="刪除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 20, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 12,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemBrand: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 4 },
  itemName: { fontSize: 15, color: '#222', marginBottom: 6 },
  itemCategory: { fontSize: 12, color: '#aaa' },
  itemPhoto: { width: 80, height: 100, borderRadius: 8, backgroundColor: '#e5e0d8' },

  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0ede8',
    backgroundColor: '#fff',
  },
  rowLabel: { width: 90, fontSize: 13, color: '#888', fontWeight: '500' },
  rowValue: { flex: 1, fontSize: 14, color: '#333' },
  rowMultiline: { lineHeight: 20 },
  usageRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  usageBtn: {
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 14, alignItems: 'center',
  },
  usageBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#faf9f7',
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtn: { borderColor: '#e57373' },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  deleteBtnText: { color: '#e57373' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { color: '#aaa', fontSize: 14 },
});
