import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from '../../src/db/context';
import { getOutfitById, deleteOutfit } from '../../src/services/outfitService';
import { getPhotoUri } from '../../src/services/photoService';
import { getItemById } from '../../src/services/itemService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import type { Outfit, Item } from '../../src/types';

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [linkedItems, setLinkedItems] = useState<Item[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOutfitById(db, id).then(async o => {
      if (!o) return;
      setOutfit(o);
      const items = await Promise.all(
        o.itemIds.map(iid => getItemById(db, iid))
      );
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

  const photos = outfit.photoIds;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← 返回</Text>
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

      <ScrollView style={styles.scroll}>
        {/* Carousel */}
        {photos.length > 0 ? (
          <View style={styles.carouselBox}>
            <Image
              source={{ uri: getPhotoUri(photos[photoIndex]) }}
              style={styles.mainPhoto}
              resizeMode="cover"
            />
            {photos.length > 1 && (
              <View style={styles.carouselNav}>
                <Pressable
                  onPress={() => setPhotoIndex(i => Math.max(0, i - 1))}
                  style={[styles.navBtn, photoIndex === 0 && styles.navBtnDisabled]}
                >
                  <Text style={styles.navText}>◀</Text>
                </Pressable>
                <Text style={styles.counter}>{photoIndex + 1} / {photos.length}</Text>
                <Pressable
                  onPress={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))}
                  style={[styles.navBtn, photoIndex === photos.length - 1 && styles.navBtnDisabled]}
                >
                  <Text style={styles.navText}>▶</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>無照片</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Row label="日期" value={outfit.date} />
          {outfit.time && <Row label="時間" value={outfit.time} />}
          {outfit.weather && <Row label="天氣" value={outfit.weather} />}
          {outfit.temperature && <Row label="氣溫" value={outfit.temperature} />}
          {outfit.county && <Row label="縣市" value={outfit.county} />}
          {outfit.place && <Row label="地點" value={outfit.place} />}
          {outfit.note && <Row label="穿搭想法" value={outfit.note} multiline />}
        </View>

        {/* Linked items */}
        {linkedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subTitle}>搭配單品（{linkedItems.length} 件）</Text>
            {linkedItems.map(item => (
              <Pressable
                key={item.id}
                style={styles.itemRow}
                onPress={() => router.push(`/closet/item/${item.id}`)}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
                </View>
                <Text style={styles.itemArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#fff', marginHorizontal: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 14, color: '#fff' },
  scroll: { flex: 1 },
  carouselBox: { backgroundColor: '#000' },
  mainPhoto: { width: '100%', aspectRatio: 3 / 4 },
  carouselNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 16, backgroundColor: '#111',
  },
  navBtn: { padding: 8 },
  navBtnDisabled: { opacity: 0.3 },
  navText: { color: '#fff', fontSize: 18 },
  counter: { color: '#ccc', fontSize: 13 },
  noPhoto: {
    height: 200, backgroundColor: '#e5e0d8',
    justifyContent: 'center', alignItems: 'center',
  },
  noPhotoText: { color: '#aaa', fontSize: 14 },
  section: {
    backgroundColor: '#fff', margin: 12, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  subTitle: { fontSize: 13, fontWeight: '600', color: '#555', paddingVertical: 10 },
  row: {
    flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  rowLabel: { width: 72, fontSize: 13, color: '#888', fontWeight: '500' },
  rowValue: { flex: 1, fontSize: 14, color: '#333' },
  rowMultiline: { lineHeight: 20 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#333' },
  itemBrand: { fontSize: 12, color: '#888', marginTop: 2 },
  itemArrow: { fontSize: 18, color: '#ccc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { color: '#aaa', fontSize: 14 },
});
