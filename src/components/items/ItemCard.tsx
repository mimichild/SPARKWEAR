import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { Item } from '../../types';
import { getPhotoUri } from '../../services/photoService';

interface Props {
  item: Item;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  themeColor?: string;
  categoryName?: string;
  /** 'grid'（預設）= 大圖卡片；'list' = 小圖橫列 */
  mode?: 'grid' | 'list';
}

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="213"><rect width="100%" height="100%" fill="#e5e0d8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7b7368" font-size="14">NO PHOTO</text></svg>'
  );

export function ItemCard({
  item, onPress, onLongPress,
  selected, selectionMode, themeColor,
  categoryName, mode = 'grid',
}: Props) {
  const coverPath = item.photoIds[0];
  const imageUri = coverPath ? getPhotoUri(coverPath) : MISSING_URI;

  if (mode === 'list') {
    const metaParts: string[] = [];
    if (categoryName) metaParts.push(categoryName);
    if (item.usageCount > 0) metaParts.push(`使用次數：${item.usageCount}`);

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.row, selected && { backgroundColor: `${themeColor ?? '#f1aba7'}18` }]}
      >
        {selectionMode && (
          <View style={[styles.checkbox, selected && { backgroundColor: themeColor ?? '#f1aba7', borderColor: themeColor ?? '#f1aba7' }]}>
            {selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <Image source={{ uri: imageUri }} style={styles.rowThumb} resizeMode="cover" />
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={2}>
            {item.brand
              ? <><Text style={styles.rowBrand}>{item.brand} </Text>{item.name}</>
              : item.name}
          </Text>
          {metaParts.length > 0 && (
            <Text style={styles.rowMeta} numberOfLines={1}>{metaParts.join('・')}</Text>
          )}
        </View>
      </Pressable>
    );
  }

  // grid mode (預設)
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, selected && { borderColor: themeColor ?? '#f1aba7', borderWidth: 2 }]}
    >
      {selectionMode && (
        <View style={[styles.checkbox, selected && { backgroundColor: themeColor ?? '#f1aba7', borderColor: themeColor ?? '#f1aba7' }]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      )}
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        {item.brand ? <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text> : null}
        <View style={styles.meta}>
          {item.purchaseDate ? (
            <Text style={styles.date}>{item.purchaseDate}</Text>
          ) : null}
          {item.usageCount > 0 && (
            <Text style={styles.usage}>{item.usageCount}次</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ── grid ──────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  image: { width: '100%', aspectRatio: 3 / 4 },
  info: { padding: 8 },
  name: { fontSize: 14, fontWeight: '500', color: '#222', lineHeight: 20 },
  brand: { fontSize: 12, color: '#888', marginTop: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  date: { fontSize: 11, color: '#bbb' },
  usage: { fontSize: 11, color: '#aaa' },

  // ── list ──────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0ede8',
    gap: 12,
  },
  rowThumb: { width: 56, height: 75, borderRadius: 6, backgroundColor: '#e5e0d8' },
  rowInfo: { flex: 1 },
  rowBrand: { fontWeight: '700', color: '#222', fontSize: 14 },
  rowName: { fontSize: 14, color: '#222', lineHeight: 20 },
  rowMeta: { fontSize: 12, color: '#888', marginTop: 4 },

  // ── shared ────────────────────────────────────────────────────
  checkbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },
});
