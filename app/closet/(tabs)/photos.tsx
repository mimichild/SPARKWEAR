import { useCallback, useMemo } from 'react';
import { View, Image, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useItems } from '../../../src/hooks/useItems';
import { getPhotoUri } from '../../../src/services/photoService';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import type { Item } from '../../../src/types';

const COLUMNS = 3;
const CELL_SIZE = Math.floor(Dimensions.get('window').width / COLUMNS);

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>'
  );

export default function PhotosTab() {
  const router = useRouter();
  const { themeColor } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const { items, loading, reload } = useItems();

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const photoItems = useMemo(
    () => items.filter(item => item.photoIds.length > 0),
    [items]
  );

  const renderItem = useCallback(({ item }: { item: Item }) => {
    const uri = getPhotoUri(item.photoIds[0]);
    return (
      <Pressable onPress={() => router.push(`/closet/item/${item.id}`)} style={styles.cell}>
        <Image
          source={{ uri }}
          style={styles.photo}
          resizeMode="cover"
          defaultSource={{ uri: MISSING_URI }}
        />
      </Pressable>
    );
  }, [router]);

  const header = (
    <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
      <Text style={styles.headerTitle}>照片</Text>
    </View>
  );

  if (!loading && photoItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        {header}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>還沒有附照片的單品</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {header}
      <FlashList
        data={photoItems}
        renderItem={renderItem}
        numColumns={COLUMNS}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cell: { width: CELL_SIZE, height: CELL_SIZE },
  photo: { width: '100%', height: '100%' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
});
