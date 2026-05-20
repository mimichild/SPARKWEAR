import { useState } from 'react';
import { View, Image, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { getPhotoUri } from '../../services/photoService';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_H  = Math.round(SCREEN_W * 4 / 3);

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCREEN_W}" height="${PHOTO_H}"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>`
  );

interface Props {
  photoPaths: string[];
  accentColor?: string;
}

export function PhotoCarousel({ photoPaths, accentColor = '#f1aba7' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const photos = photoPaths.length > 0 ? photoPaths : ['__missing__'];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScroll={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setActiveIndex(idx);
        }}
      >
        {photos.map((path, i) => {
          const uri = path === '__missing__' ? MISSING_URI : getPhotoUri(path);
          return (
            <Image
              key={i}
              source={{ uri }}
              style={styles.photo}
              resizeMode="cover"
            />
          );
        })}
      </ScrollView>

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
  container: {
    width: SCREEN_W,
    height: PHOTO_H,
  },
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
