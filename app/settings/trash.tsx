import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from '../../src/db/context';
import { getTrashItems, restoreFromTrash, deleteItem } from '../../src/services/itemService';
import { deletePhotos } from '../../src/services/photoService';
import { getPhotoUri } from '../../src/services/photoService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import type { Item, Photo } from '../../src/types';

const THUMB = Math.floor(Dimensions.get('window').width / 4);

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>');

function daysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const expiry = deleted + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function TrashScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<Item[]>([]);
  const [restoreTarget, setRestoreTarget] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const load = useCallback(async () => {
    const data = await getTrashItems(db);
    setItems(data);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    await restoreFromTrash(db, restoreTarget.id);
    setRestoreTarget(null);
    await load();
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.photoIds.length > 0) {
      const photos = deleteTarget.photoIds.map(p => ({ id: p, path: p, mimeType: 'image/jpeg', createdAt: '' } as Photo));
      await deletePhotos(photos);
    }
    await deleteItem(db, deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>暫存區</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暫存區沒有單品</Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>暫存區的單品將在 30 天後永久刪除</Text>
            {items.map(item => {
              const uri = item.photoIds.length > 0 ? getPhotoUri(item.photoIds[0]) : MISSING_URI;
              const days = daysLeft(item.deletedAt ?? '');
              return (
                <View key={item.id} style={styles.row}>
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                  <View style={styles.info}>
                    {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={[styles.days, days <= 3 && styles.daysUrgent]}>
                      剩 {days} 天
                    </Text>
                  </View>
                  <View style={styles.btns}>
                    <Pressable
                      onPress={() => setRestoreTarget(item)}
                      style={[styles.btn, { borderColor: themeColor }]}
                    >
                      <Text style={[styles.btnText, { color: themeColor }]}>還原</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setDeleteTarget(item)}
                      style={[styles.btn, styles.delBtn]}
                    >
                      <Text style={[styles.btnText, styles.delBtnText]}>永久刪除</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog
        visible={!!restoreTarget}
        title="還原單品"
        message={`確定要還原「${restoreTarget?.name}」嗎？`}
        confirmLabel="還原"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="永久刪除"
        message={`確定要永久刪除「${deleteTarget?.name}」嗎？此操作無法復原。`}
        confirmLabel="永久刪除"
        danger
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2, minWidth: 60 },
  headerBtnText: { fontSize: 14, color: '#fff' },
  hint: { fontSize: 12, color: '#aaa', textAlign: 'center', marginVertical: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#bbb' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0ede8',
    gap: 12,
  },
  thumb: { width: THUMB, height: Math.round(THUMB * 4 / 3), borderRadius: 6 },
  info: { flex: 1 },
  brand: { fontSize: 12, color: '#888', marginBottom: 2 },
  name: { fontSize: 14, color: '#333', fontWeight: '500' },
  days: { fontSize: 11, color: '#aaa', marginTop: 4 },
  daysUrgent: { color: '#e57373', fontWeight: '600' },
  btns: { gap: 6 },
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  btnText: { fontSize: 12, fontWeight: '600' },
  delBtn: { borderColor: '#e57373' },
  delBtnText: { color: '#e57373' },
});
