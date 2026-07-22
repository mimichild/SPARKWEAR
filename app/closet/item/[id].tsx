import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';

const THUMB_W = Math.floor(Dimensions.get('window').width / 5);
const THUMB_H = Math.round(THUMB_W * 4 / 3);
const OUTFITS_PER_PAGE = 10;
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoCarousel } from '../../../src/components/shared/PhotoCarousel';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from '../../../src/db/context';
import { getItemById, moveToTrash } from '../../../src/services/itemService';
import { getCategories, getOrigins, getColors } from '../../../src/services/categoryService';
import { getPhotoUri } from '../../../src/services/photoService';
import { getOutfitsByItemId } from '../../../src/services/outfitService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { Item, Category, Origin, Color, Outfit } from '../../../src/types';

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
  const [colorNames, setColorNames] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [itemOutfits, setItemOutfits] = useState<Outfit[]>([]);
  const [outfitPage, setOutfitPage] = useState(0);
  const [logUsageCount, setLogUsageCount] = useState(0);

  // 用 useFocusEffect（不是 useEffect）重新載入，這樣從新增穿搭紀錄等
  // 其他畫面返回時，使用次數／穿搭紀錄等資料才會更新，不會停留在舊的快取畫面。
  useFocusEffect(useCallback(() => {
    if (!id) return;
    Promise.all([
      getItemById(db, id),
      getCategories(db),
      getOrigins(db),
      getColors(db),
      getOutfitsByItemId(db, id),
      db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM item_usage_logs WHERE item_id = ?', [id]
      ),
    ]).then(([loadedItem, cats, origs, cols, outfits, logRow]) => {
      setItem(loadedItem);
      setCategories(cats);
      setOrigins(origs);
      setColors(cols);
      setItemOutfits(outfits);
      setLogUsageCount(logRow?.count ?? 0);
    });
  }, [id, db]));

  // 顏色名稱：直接用 item.colorIds 查 DB，不依賴 colors 狀態的時序
  useEffect(() => {
    if (!item || item.colorIds.length === 0) { setColorNames(''); return; }
    const placeholders = item.colorIds.map(() => '?').join(',');
    db.getAllAsync<{ name: string }>(
      `SELECT name FROM colors WHERE id IN (${placeholders})`,
      item.colorIds
    ).then(rows => {
      setColorNames(rows.map(r => r.name).join('、'));
    }).catch(() => setColorNames(''));
  }, [item, db]);

  const handleDelete = async () => {
    if (!item) return;
    await moveToTrash(db, item.id);
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
  const photos = item.photoIds;

  const detailsData = [
    { label: '品牌',    value: item.brand,                                    visible: false },
    { label: '購買日期', value: item.purchaseDate,                              visible: !!item.purchaseDate },
    { label: '分類',    value: catName,                                        visible: !!catName },
    { label: '來源',    value: originName,                                     visible: !!originName },
    { label: '顏色',    value: colorNames,                                     visible: !!colorNames },
    { label: '分級',    value: item.grade ? `${item.grade}級` : '',              visible: !!item.grade },
    { label: '尺寸',    value: item.size,                                      visible: !!item.size },
    { label: '原價',    value: item.originalPrice  != null ? `$${item.originalPrice}`  : '', visible: item.originalPrice  != null },
    { label: '特價',    value: item.specialPrice   != null ? `$${item.specialPrice}`   : '', visible: item.specialPrice   != null },
    { label: '優惠價',  value: item.discountPrice  != null ? `$${item.discountPrice}`  : '', visible: item.discountPrice  != null },
    { label: '體重',    value: item.weight ? `${item.weight} kg` : '',         visible: !!item.weight },
    { label: '身材',    value: item.bodyType,                                  visible: !!item.bodyType },
    { label: '建議體重', value: item.suggestedWeight,                           visible: !!item.suggestedWeight },
    { label: '季節',    value: item.seasons.join('、'),                        visible: item.seasons.length > 0 },
    { label: '使用次數', value: `${logUsageCount} 次`, visible: true },
    (() => {
      const prices = [item.discountPrice, item.specialPrice, item.originalPrice]
        .filter((p): p is number => p != null);
      if (prices.length === 0) return null;
      const minPrice = Math.min(...prices);
      const avgValue = logUsageCount > 0
        ? `$${(minPrice / logUsageCount).toFixed(0)}/次`
        : `$${minPrice}（未使用）`;
      return { label: '平均使用價格', value: avgValue, visible: true };
    })(),
    { label: '小紀錄',  value: item.miniNote,   visible: !!item.miniNote,  multiline: true },
    { label: '優點',    value: item.pros,       visible: !!item.pros,      multiline: true },
    { label: '缺點',    value: item.cons || '無',    visible: true, multiline: true },
    { label: '備註',    value: item.remark || '無',  visible: true, multiline: true },
  ].filter(d => d != null && d.visible) as { label: string; value: string; multiline?: boolean }[];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>返回</Text>
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>我的衣櫃</Text>
        <View style={styles.headerLeft} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} directionalLockEnabled={true}>
        {/* 全寬 3:4 照片輪播 */}
        <PhotoCarousel photoPaths={photos} accentColor={themeColor} />

        {/* 單品標題卡 */}
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.brand ? `${item.brand}　${item.name}` : item.name}
          </Text>
        </View>

        {detailsData.map((detail, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.rowLabel}>{detail.label}</Text>
            <Text
              style={[styles.rowValue, detail.multiline && styles.rowMultiline]}
              numberOfLines={detail.multiline ? undefined : 1}
            >
              {detail.value}
            </Text>
          </View>
        ))}

        {/* 使用該單品的穿搭 */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(itemOutfits.length / OUTFITS_PER_PAGE));
          const paged = itemOutfits.slice(outfitPage * OUTFITS_PER_PAGE, (outfitPage + 1) * OUTFITS_PER_PAGE);
          return (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>使用該單品的穿搭</Text>
                {itemOutfits.length > 0 && (
                  <Text style={styles.sectionCount}>{itemOutfits.length} 筆</Text>
                )}
              </View>

              {itemOutfits.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>尚無穿搭紀錄</Text>
                </View>
              ) : (
                <>
                  <View style={styles.outfitGrid}>
                    {paged.map(outfit => {
                      const uri = outfit.photoIds.length > 0
                        ? getPhotoUri(outfit.photoIds[0]) : null;
                      return (
                        <Pressable
                          key={outfit.id}
                          style={styles.outfitThumb}
                          onPress={() => router.push(`/outfits/${outfit.id}`)}
                        >
                          {uri ? (
                            <Image source={{ uri }} style={styles.outfitThumbImg} resizeMode="cover" />
                          ) : (
                            <View style={styles.outfitThumbEmpty} />
                          )}
                          <Text style={styles.outfitThumbDate} numberOfLines={1}>{outfit.date}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {totalPages > 1 && (
                    <View style={styles.pagination}>
                      <Pressable
                        onPress={() => setOutfitPage(p => Math.max(0, p - 1))}
                        disabled={outfitPage === 0}
                        style={styles.pageBtn}
                      >
                        <Text style={[styles.pageBtnText, outfitPage === 0 && styles.pageBtnDisabled]}>‹</Text>
                      </Pressable>
                      <Text style={styles.pageIndicator}>{outfitPage + 1} / {totalPages}</Text>
                      <Pressable
                        onPress={() => setOutfitPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={outfitPage === totalPages - 1}
                        style={styles.pageBtn}
                      >
                        <Text style={[styles.pageBtnText, outfitPage === totalPages - 1 && styles.pageBtnDisabled]}>›</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </>
          );
        })()}

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
      </ScrollView>

      <ConfirmDialog
        visible={deleteVisible}
        title="移至暫存區"
        message={`確定要將「${item.name}」移至暫存區嗎？\n30 天內可在設定中還原。`}
        confirmLabel="移至暫存區"
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
  },
  headerLeft: { flex: 1 },
  backBtn: { paddingVertical: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  itemCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  colorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  colorChip: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1, borderColor: '#ddd',
    backgroundColor: '#f5f3f0',
  },
  colorChipText: { fontSize: 12, color: '#555' },

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

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f3f0',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8e4de',
    marginTop: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666' },
  sectionCount: { fontSize: 12, color: '#aaa' },
  emptyRow: {
    paddingVertical: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#bbb' },
  outfitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
  },
  outfitThumb: {
    width: THUMB_W,
    paddingBottom: 6,
  },
  outfitThumbImg: {
    width: THUMB_W,
    height: THUMB_H,
  },
  outfitThumbEmpty: {
    width: THUMB_W,
    height: THUMB_H,
    backgroundColor: '#e5e0d8',
  },
  outfitThumbDate: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 1,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0ede8',
  },
  pageBtn: { padding: 8 },
  pageBtnText: { fontSize: 26, color: '#555', lineHeight: 28 },
  pageBtnDisabled: { color: '#ddd' },
  pageIndicator: { fontSize: 13, color: '#666', minWidth: 40, textAlign: 'center' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { color: '#aaa', fontSize: 14 },
});
