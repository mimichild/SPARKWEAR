import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, Dimensions,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from '../../src/db/context';
import { getOutfitById, deleteOutfit } from '../../src/services/outfitService';
import { getPhotoUri } from '../../src/services/photoService';
import { getItemById } from '../../src/services/itemService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useUIStore } from '../../src/stores/uiStore';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { PhotoCarousel } from '../../src/components/shared/PhotoCarousel';
import { getNeighborIds } from '../../src/utils/itemNav';
import type { Outfit, Item } from '../../src/types';

const SCREEN_W        = Dimensions.get('window').width;
const THUMB_W         = Math.floor(SCREEN_W / 5);
const THUMB_H         = Math.round(THUMB_W * 4 / 3);
const ITEMS_PER_PAGE  = 10;

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();
  const { setItemNavIds, outfitNavIds } = useUIStore();
  const insets = useSafeAreaInsets();

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [linkedItems, setLinkedItems] = useState<Item[]>([]);
  const [itemPage, setItemPage] = useState(0);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOutfitById(db, id).then(async o => {
      if (!o) return;
      setOutfit(o);
      const items = await Promise.all(o.itemIds.map(iid => getItemById(db, iid)));
      setLinkedItems(items.filter((i): i is Item => i !== null));
    });
  }, [id, db]);

  const handleDelete = async () => {
    if (!outfit) return;
    await deleteOutfit(db, outfit.id);
    router.back();
  };

  if (!outfit) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><Text style={styles.loading}>載入中...</Text></View>
      </SafeAreaView>
    );
  }

  const totalItemPages = Math.max(1, Math.ceil(linkedItems.length / ITEMS_PER_PAGE));
  const pagedItems     = linkedItems.slice(itemPage * ITEMS_PER_PAGE, (itemPage + 1) * ITEMS_PER_PAGE);

  // 左右滑動切換上一筆/下一筆穿搭：手勢只包在照片輪播以外的區域，
  // 避免跟 PhotoCarousel 自己的左右滑動照片手勢搶手勢。
  const { prevId, nextId } = getNeighborIds(outfitNavIds, outfit.id);
  const goToOutfit = (targetId: string) => router.replace(`/outfits/${targetId}`);
  const navPan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      'worklet';
      const threshold = SCREEN_W * 0.25;
      if (e.translationX < -threshold && nextId) {
        runOnJS(goToOutfit)(nextId);
      } else if (e.translationX > threshold && prevId) {
        runOnJS(goToOutfit)(prevId);
      }
    });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{outfit.date}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push(`/outfits/form?id=${outfit.id}`)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>編輯</Text>
          </Pressable>
          <Pressable onPress={() => setDeleteVisible(true)} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: '#ffcdd2' }]}>刪除</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} directionalLockEnabled>
        {/* 照片輪播（手勢左右滑） */}
        {outfit.photoIds.length > 0 ? (
          <PhotoCarousel photoPaths={outfit.photoIds} accentColor={themeColor} />
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>無照片</Text>
          </View>
        )}

        {/* 照片輪播以外的區域：包一個水平滑動手勢，用來切換上一筆/下一筆穿搭 */}
        <GestureDetector gesture={navPan}>
          <View>
            {/* 資訊列 */}
            <View style={styles.section}>
              <Row label="日期"   value={outfit.date} />
              {outfit.time        && <Row label="時間"   value={outfit.time} />}
              {outfit.weather     && <Row label="天氣"   value={outfit.weather} />}
              {outfit.temperature && <Row label="氣溫"   value={outfit.temperature} />}
              {outfit.county      && <Row label="縣市"   value={outfit.county} />}
              {outfit.place       && <Row label="地點"   value={outfit.place} />}
              {outfit.note        && <Row label="穿搭想法" value={outfit.note} multiline />}
            </View>

            {/* 搭配單品照片牆 */}
            {linkedItems.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>搭配單品</Text>
                  <Text style={styles.sectionCount}>{linkedItems.length} 件</Text>
                </View>

                <View style={styles.itemGrid}>
                  {pagedItems.map(item => {
                    const uri = item.photoIds.length > 0
                      ? getPhotoUri(item.photoIds[0]) : null;
                    return (
                      <Pressable
                        key={item.id}
                        style={styles.itemThumb}
                        onPress={() => {
                          setItemNavIds([]);
                          router.push(`/closet/item/${item.id}`);
                        }}
                      >
                        {uri ? (
                          <Image source={{ uri }} style={styles.itemThumbImg} resizeMode="cover" />
                        ) : (
                          <View style={styles.itemThumbEmpty} />
                        )}
                        <Text style={styles.itemThumbName} numberOfLines={1}>
                          {item.brand || item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {totalItemPages > 1 && (
                  <View style={styles.pagination}>
                    <Pressable
                      onPress={() => setItemPage(p => Math.max(0, p - 1))}
                      disabled={itemPage === 0}
                      style={styles.pageBtn}
                    >
                      <Text style={[styles.pageBtnText, itemPage === 0 && styles.pageBtnDisabled]}>‹</Text>
                    </Pressable>
                    <Text style={styles.pageIndicator}>{itemPage + 1} / {totalItemPages}</Text>
                    <Pressable
                      onPress={() => setItemPage(p => Math.min(totalItemPages - 1, p + 1))}
                      disabled={itemPage === totalItemPages - 1}
                      style={styles.pageBtn}
                    >
                      <Text style={[styles.pageBtnText, itemPage === totalItemPages - 1 && styles.pageBtnDisabled]}>›</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            <View style={{ height: 40 }} />
          </View>
        </GestureDetector>
      </ScrollView>

      <ConfirmDialog
        visible={deleteVisible}
        title="確認刪除"
        message={`確定要刪除 ${outfit.date} 的穿搭紀錄嗎？`}
        confirmLabel="刪除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, multiline && styles.rowMultiline]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#fff', marginHorizontal: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },

  noPhoto: {
    height: 200, backgroundColor: '#e5e0d8',
    justifyContent: 'center', alignItems: 'center',
  },
  noPhotoText: { color: '#aaa', fontSize: 14 },

  section: {
    backgroundColor: '#fff', margin: 12, borderRadius: 12,
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4,
  },
  row: {
    flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  rowLabel: { width: 72, fontSize: 13, color: '#888', fontWeight: '500' },
  rowValue: { flex: 1, fontSize: 14, color: '#333' },
  rowMultiline: { lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#f5f3f0',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8e4de',
    marginTop: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666' },
  sectionCount: { fontSize: 12, color: '#aaa' },

  itemGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#fff',
  },
  itemThumb: { width: THUMB_W, paddingBottom: 6 },
  itemThumbImg: { width: THUMB_W, height: THUMB_H },
  itemThumbEmpty: { width: THUMB_W, height: THUMB_H, backgroundColor: '#e5e0d8' },
  itemThumbName: {
    fontSize: 9, color: '#888', textAlign: 'center',
    marginTop: 2, paddingHorizontal: 1,
  },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, backgroundColor: '#fff', gap: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0ede8',
  },
  pageBtn: { padding: 8 },
  pageBtnText: { fontSize: 26, color: '#555', lineHeight: 28 },
  pageBtnDisabled: { color: '#ddd' },
  pageIndicator: { fontSize: 13, color: '#666', minWidth: 40, textAlign: 'center' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { color: '#aaa', fontSize: 14 },
});
