import { useState } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from 'react-native-reanimated';
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
  const translateX = useSharedValue(0);
  const startX     = useSharedValue(0);

  const photos = photoPaths.length > 0 ? photoPaths : ['__missing__'];
  const count  = photos.length;

  const pan = Gesture.Pan()
    // 水平移動 10px 才啟動，垂直移動 10px 就讓給外層 ScrollView
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(e => {
      const raw     = startX.value + e.translationX;
      // 硬限制：不允許超出第一張（x>0）或最後一張（x<-(count-1)*SCREEN_W）
      translateX.value = Math.min(0, Math.max(-(count - 1) * SCREEN_W, raw));
    })
    .onEnd(e => {
      const threshold = SCREEN_W * 0.3;
      const base      = Math.round(-startX.value / SCREEN_W);
      let next        = base;

      if (e.translationX < -threshold) next = Math.min(count - 1, base + 1);
      else if (e.translationX > threshold) next = Math.max(0, base - 1);

      translateX.value = withSpring(-next * SCREEN_W, { damping: 20, stiffness: 200 });
      runOnJS(setActiveIndex)(next);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.strip, { width: SCREEN_W * count }, animStyle]}>
          {photos.map((path, i) => {
            const uri = path === '__missing__' ? MISSING_URI : getPhotoUri(path);
            return (
              <Image key={i} source={{ uri }} style={styles.photo} resizeMode="cover" />
            );
          })}
        </Animated.View>
      </GestureDetector>

      {count > 1 && (
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
    overflow: 'hidden',
  },
  strip: {
    height: PHOTO_H,
    flexDirection: 'row',
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
