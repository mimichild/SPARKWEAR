/**
 * PhotoCarousel — 全寬 3:4 照片輪播
 * - pagingEnabled FlatList，左右滑動換頁
 * - 右往左 = 下一張，左往右 = 上一張（FlatList 預設行為）
 * - 底部顯示圓點指示器
 */
import { useState, useCallback, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, FlatList, ViewToken } from 'react-native';
import { getPhotoUri } from '../../services/photoService';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_H  = Math.round(SCREEN_W * 4 / 3);

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCREEN_W}" height="${PHOTO_H}"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>`
  );

interface Props {
  photoPaths: string[]; // full file paths stored in item.photoIds
  accentColor?: string;
}

export function PhotoCarousel({ photoPaths, accentColor = '#f1aba7' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const photos = photoPaths.length > 0 ? photoPaths : ['__missing__'];

  return (
    <View>
      <FlatList
        data={photos}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item: path }) => {
          const uri = path === '__missing__' ? MISSING_URI : getPhotoUri(path);
          return (
            <Image
              source={{ uri }}
              style={styles.photo}
              resizeMode="cover"
            />
          );
        }}
      />

      {/* 圓點指示器（只有超過 1 張才顯示） */}
      {photos.length > 1 && (
        <View style={styles.dots}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? { backgroundColor: accentColor, width: 16 }
                  : { backgroundColor: 'rgba(255,255,255,0.5)' },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: SCREEN_W,
    height: PHOTO_H,
    backgroundColor: '#e5e0d8',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
});
