import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, SafeAreaView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from '../../../src/db/context';
import { getItemById, deleteItem } from '../../../src/services/itemService';
import { getCategories, getOrigins, getColors } from '../../../src/services/categoryService';
import { getPhotoUri, deletePhotos } from '../../../src/services/photoService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { Item, Category, Origin, Color } from '../../../src/types';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();

  const [item, setItem] = useState<Item | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
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
    // In a real flow we'd pass actual Photo objects; here we just delete by id
    await deleteItem(db, item.id);
    router.back();
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><Text style={styles.loading}>載入中...</Text></View>
      </SafeAreaView>
    );
  }

  const catName = categories.find(c => c.id === item.categoryId)?.name ?? '';
  const originName = origins.find(o => o.id === item.originId)?.name ?? '';
  const colorNames = item.colorIds.map(cid => colors.find(c => c.id === cid)?.name).filter(Boolean).join('、');
  const photos = item.photoIds;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push(`/closet/item/form?id=${item.id}`)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>編輯</Text>
          </Pressable>
          <Pressable onPress={() => setDeleteVisible(true)} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: '#ffcdd2' }]}>刪除</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        {/* Photo carousel */}
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
                  <Text style={styles.navBtnText}>◀</Text>
                </Pressable>
                <Text style={styles.photoCounter}>{photoIndex + 1} / {photos.length}</Text>
                <Pressable
                  onPress={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))}
                  style={[styles.navBtn, photoIndex === photos.length - 1 && styles.navBtnDisabled]}
                >
                  <Text style={styles.navBtnText}>▶</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>無照片</Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.section}>
          <Row label="商品名稱" value={item.name} />
          {item.brand && <Row label="品牌" value={item.brand} />}
          {item.purchaseDate && <Row label="購買日期" value={item.purchaseDate} />}
          {catName && <Row label="分類" value={catName} />}
          {originName && <Row label="來源" value={originName} />}
          {colorNames && <Row label="顏色" value={colorNames} />}
          {item.grade && <Row label="分級" value={item.grade} />}
          {item.size && <Row label="尺寸" value={item.size} />}
          {item.originalPrice != null && <Row label="原價" value={`$${item.originalPrice}`} />}
          {item.specialPrice != null && <Row label="特價" value={`$${item.specialPrice}`} />}
          {item.discountPrice != null && <Row label="優惠價" value={`$${item.discountPrice}`} />}
          {item.weight && <Row label="體重" value={`${item.weight} kg`} />}
          {item.bodyType && <Row label="身材" value={item.bodyType} />}
          {item.suggestedWeight && <Row label="建議體重" value={item.suggestedWeight} />}
          <Row label="使用次數" value={`${item.usageCount} 次`} />
          {item.seasons.length > 0 && <Row label="季節" value={item.seasons.join('、')} />}
          {item.miniNote && <Row label="小紀錄" value={item.miniNote} multiline />}
          {item.pros && <Row label="優點" value={item.pros} multiline />}
          {item.cons && <Row label="缺點" value={item.cons} multiline />}
          {item.remark && <Row label="備註" value={item.remark} multiline />}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
  navBtnText: { color: '#fff', fontSize: 18 },
  photoCounter: { color: '#ccc', fontSize: 13 },
  noPhoto: {
    height: 200, backgroundColor: '#e5e0d8',
    justifyContent: 'center', alignItems: 'center',
  },
  noPhotoText: { color: '#aaa', fontSize: 14 },
  section: {
    backgroundColor: '#fff', margin: 12, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  row: {
    flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  rowLabel: { width: 90, fontSize: 13, color: '#888', fontWeight: '500' },
  rowValue: { flex: 1, fontSize: 14, color: '#333' },
  rowMultiline: { lineHeight: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { color: '#aaa', fontSize: 14 },
});
