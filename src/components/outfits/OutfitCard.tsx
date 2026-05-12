import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { Outfit } from '../../types';
import { getPhotoUri } from '../../services/photoService';

interface Props {
  outfit: Outfit;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  themeColor?: string;
}

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="100%" height="100%" fill="#e5e0d8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7b7368" font-size="14">NO PHOTO</text></svg>'
  );

export function OutfitCard({
  outfit, onPress, onLongPress,
  selected, selectionMode, themeColor,
}: Props) {
  const coverPath = outfit.photoIds[0];
  const imageUri = coverPath ? getPhotoUri(coverPath) : MISSING_URI;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        selected && { borderColor: themeColor ?? '#f1aba7', borderWidth: 2 },
      ]}
    >
      {selectionMode && (
        <View style={[
          styles.checkbox,
          selected && { backgroundColor: themeColor ?? '#f1aba7', borderColor: themeColor ?? '#f1aba7' },
        ]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      )}

      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

      <View style={styles.info}>
        <Text style={styles.date}>{outfit.date}</Text>
        {(outfit.weather || outfit.temperature) && (
          <Text style={styles.meta} numberOfLines={1}>
            {[outfit.weather, outfit.temperature].filter(Boolean).join(' · ')}
          </Text>
        )}
        {(outfit.county || outfit.place) && (
          <Text style={styles.meta} numberOfLines={1}>
            {[outfit.county, outfit.place].filter(Boolean).join(' ')}
          </Text>
        )}
        {outfit.itemIds.length > 0 && (
          <Text style={styles.itemCount}>{outfit.itemIds.length} 件單品</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  image: { width: '100%', aspectRatio: 3 / 4 },
  info: { padding: 8 },
  date: { fontSize: 13, fontWeight: '600', color: '#333' },
  meta: { fontSize: 11, color: '#888', marginTop: 2 },
  itemCount: { fontSize: 11, color: '#aaa', marginTop: 4 },
  checkbox: {
    position: 'absolute', top: 6, right: 6, zIndex: 10,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#ccc', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },
});
