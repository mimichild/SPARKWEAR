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
  const raw   = photoPaths.length > 0 ? photoPaths : ['__missing__'];
  const count = raw.length;

  // 循環陣列：[last_clone, photo0, photo1, ..., photoN, first_clone]
  // 單張時直接用原陣列，不需要循環邏輯
  const loop   = count > 1;
  const photos = loop ? [raw[count - 1], ...raw, raw[0]] : raw;
  const total  = photos.length;

  // dotIndex：顯示在圓點上的真實索引（0 ~ count-1）
  const [dotIndex, setDotIndex] = useState(0);

  // 從虛擬索引（loop 模式下 1 = 第一張真實照片）開始
  const vIdx       = useSharedValue(loop ? 1 : 0);
  const translateX = useSharedValue(loop ? -SCREEN_W : 0);
  const startX     = useSharedValue(loop ? -SCREEN_W : 0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      'worklet';
      startX.value = translateX.value;
    })
    .onUpdate(e => {
      'worklet';
      translateX.value = startX.value + e.translationX;
    })
    .onEnd(e => {
      'worklet';
      const threshold = SCREEN_W * 0.3;
      let next = vIdx.value;
      if (e.translationX < -threshold)      next = vIdx.value + 1;   // 左滑→下一張
      else if (e.translationX > threshold)  next = vIdx.value - 1;   // 右滑→上一張

      // 超出 clone 邊界時限制到最近的 clone（0 或 total-1）
      next = Math.max(0, Math.min(total - 1, next));

      // 動畫結束後處理 clone → 跳回真實位置
      translateX.value = withSpring(-next * SCREEN_W, { damping: 20, stiffness: 200 }, () => {
        'worklet';
        if (loop && next === 0) {
          // 落在 last_clone → 無聲跳到真實 last（index = count）
          translateX.value = -count * SCREEN_W;
          vIdx.value = count;
          runOnJS(setDotIndex)(count - 1);
        } else if (loop && next === count + 1) {
          // 落在 first_clone → 無聲跳到真實 first（index = 1）
          translateX.value = -SCREEN_W;
          vIdx.value = 1;
          runOnJS(setDotIndex)(0);
        } else {
          vIdx.value = next;
          runOnJS(setDotIndex)(loop ? next - 1 : next);
        }
      });
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.strip, { width: SCREEN_W * total }, animStyle]}>
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
          {raw.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === dotIndex
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
