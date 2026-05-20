/**
 * PhotoEditorModal
 *
 * 功能：
 *   - 雙指縮放 + 單指拖曳（Pinch + Pan）
 *   - 以 3:4 框裁切並儲存（cover 模式）
 *   - 亮度、陰影滑桿（視覺預覽）
 *   - 上一張 / 跳過 / 確認(下一張) / 完成
 *
 * 注意：Modal 必須自帶 GestureHandlerRootView，
 *       否則手勢在 Modal 層無效。
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet,
  Dimensions, PanResponder, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_W } = Dimensions.get('window');

// 3:4 固定裁切框
const FRAME_W = SCREEN_W;
const FRAME_H = Math.round(SCREEN_W * 4 / 3);

export interface EditablePhoto {
  uri: string;
  width?: number;
  height?: number;
}

interface Props {
  photos: EditablePhoto[];
  visible: boolean;
  themeColor: string;
  onComplete: (uris: string[]) => void;
  onCancel: () => void;
}

// ── 簡易水平滑桿 ──────────────────────────────────────────────
function Slider({
  value, min, max, label, themeColor, onChange,
}: {
  value: number; min: number; max: number;
  label: string; themeColor: string;
  onChange: (v: number) => void;
}) {
  const TRACK_W = SCREEN_W - 100;
  const ratio = (value - min) / (max - min);
  const thumbX = ratio * TRACK_W;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(TRACK_W, thumbX + gs.dx));
        onChange(min + (newX / TRACK_W) * (max - min));
      },
    })
  ).current;

  return (
    <View style={ss.sliderWrap}>
      <Text style={ss.sliderLabel}>{label}</Text>
      <View style={[ss.track, { width: TRACK_W }]} {...responder.panHandlers}>
        <View style={[ss.filled, { width: thumbX, backgroundColor: themeColor }]} />
        <View style={[ss.thumb, { left: thumbX - 10, backgroundColor: themeColor }]} />
      </View>
      <Text style={ss.sliderVal}>{value >= 0 ? '+' : ''}{Math.round(value * 100)}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────
export function PhotoEditorModal({ photos, visible, themeColor, onComplete, onCancel }: Props) {
  const [index, setIndex] = useState(0);
  const [editedUris, setEditedUris] = useState<string[]>(() => photos.map(p => p.uri));
  const [brightness, setBrightness] = useState(0);
  const [shadow, setShadow] = useState(0);
  const [applying, setApplying] = useState(false);

  // ── 手勢 shared values ──────────────────────────────────────
  const scale      = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX      = useSharedValue(0);
  const offsetY      = useSharedValue(0);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);

  const resetGesture = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    offsetX.value = withSpring(0);
    offsetY.value = withSpring(0);
    savedOffsetX.value = 0;
    savedOffsetY.value = 0;
    setBrightness(0);
    setShadow(0);
  }, [scale, savedScale, offsetX, offsetY, savedOffsetX, savedOffsetY]);

  // modal が開くたびに editedUris を photos に同期
  // （コンポーネントは常駐なので useState 初期化は一度しか走らない）
  useEffect(() => {
    if (visible && photos.length > 0) {
      setEditedUris(photos.map(p => p.uri));
      setIndex(0);
      setBrightness(0);
      setShadow(0);
      setApplying(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pinch gesture（最小 scale = 1）
  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .onUpdate(e => {
      offsetX.value = savedOffsetX.value + e.translationX;
      offsetY.value = savedOffsetY.value + e.translationY;
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  // ── 3:4 裁切計算並套用 ────────────────────────────────────
  const applyCrop = useCallback(async (uri: string | undefined, imgW: number, imgH: number): Promise<string> => {
    const sourceUri = uri ?? photos[index]?.uri;
    if (!sourceUri) throw new Error('照片 URI 不存在');
    // uri を sourceUri に置き換えて以降で使用
    const s = savedScale.value;
    const tx = savedOffsetX.value;
    const ty = savedOffsetY.value;

    // Scale-to-cover: 讓圖片「蓋滿」3:4 框
    const sf = Math.max(FRAME_W / imgW, FRAME_H / imgH);

    // 裁切區域（image pixel 單位），維持 3:4
    const cropW = FRAME_W / (sf * s);
    const cropH = FRAME_H / (sf * s);

    // 裁切原點（以圖片中心為基準，再加上拖曳偏移）
    const originX = Math.max(0, Math.min(
      imgW - cropW,
      imgW / 2 - cropW / 2 - tx / (sf * s)
    ));
    const originY = Math.max(0, Math.min(
      imgH - cropH,
      imgH / 2 - cropH / 2 - ty / (sf * s)
    ));

    // 永遠執行 manipulateAsync，確保回傳 file:// URI（解決 content:// 問題）
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ crop: { originX, originY, width: Math.max(1, cropW), height: Math.max(1, cropH) } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }, [savedScale, savedOffsetX, savedOffsetY, photos, index]);

  // ── Navigation ──────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setApplying(true);
    try {
      const photo = photos[index];
      const cropped = await applyCrop(
        editedUris[index] ?? photo?.uri,
        photo?.width ?? 1080,
        photo?.height ?? 1440
      );
      const next = [...editedUris];
      next[index] = cropped;
      setEditedUris(next);

      if (index < photos.length - 1) {
        setIndex(index + 1);
        resetGesture();
      } else {
        onComplete(next);
      }
    } finally { setApplying(false); }
  }, [index, photos, editedUris, applyCrop, onComplete, resetGesture]);

  const handleSkip = useCallback(async () => {
    // 即使跳過也把 URI 轉成穩定的 file://（解決 content:// 問題）
    setApplying(true);
    try {
      const photo = photos[index];
      const sourceUri = editedUris[index] ?? photo?.uri;
      if (!sourceUri) { setApplying(false); return; }
      const stable = await ImageManipulator.manipulateAsync(
        sourceUri,
        [],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      ).then(r => r.uri);
      const next = [...editedUris];
      next[index] = stable;
      setEditedUris(next);

      if (index < photos.length - 1) {
        setIndex(index + 1);
        resetGesture();
      } else {
        onComplete(next);
      }
    } finally { setApplying(false); }
  }, [index, photos, editedUris, onComplete, resetGesture]);

  const handlePrev = useCallback(() => {
    if (index > 0) { setIndex(index - 1); resetGesture(); }
  }, [index, resetGesture]);

  const handleDone = useCallback(async () => {
    // 確保所有剩餘照片也轉為穩定 file://
    setApplying(true);
    try {
      const stableUris = await Promise.all(
        editedUris.map((uri, i) => {
          if (i <= index) return Promise.resolve(uri); // already processed
          return ImageManipulator.manipulateAsync(uri, [], {
            compress: 0.82, format: ImageManipulator.SaveFormat.JPEG,
          }).then(r => r.uri);
        })
      );
      onComplete(stableUris);
    } finally { setApplying(false); }
  }, [editedUris, index, onComplete]);

  if (!photos.length) return null;

  const current = editedUris[index] ?? photos[index]?.uri;
  const isLast = index === photos.length - 1;

  const brightColor   = brightness > 0 ? '#fff' : '#000';
  const brightOpacity = Math.abs(brightness) * 0.55;
  const shadowColor   = shadow > 0 ? '#fff' : '#000';
  const shadowOpacity = Math.abs(shadow) * 0.35;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      {/* Modal 必須自帶 GestureHandlerRootView */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={ss.safe}>
          {/* Header */}
          <View style={[ss.header, { backgroundColor: themeColor }]}>
            <Pressable onPress={onCancel} style={ss.headerBtn}>
              <Text style={ss.headerTxt}>取消</Text>
            </Pressable>
            <Text style={ss.headerTitle}>{index + 1} / {photos.length}</Text>
            <Pressable onPress={handleDone} disabled={applying} style={ss.headerBtn}>
              <Text style={[ss.headerTxt, { fontWeight: '700' }]}>完成</Text>
            </Pressable>
          </View>

          {/* 3:4 裁切框 */}
          <View style={ss.frameWrap}>
            <GestureDetector gesture={composed}>
              <Animated.View style={[ss.imageWrap, animStyle]}>
                <Image
                  source={{ uri: current }}
                  style={ss.photo}
                  resizeMode="cover"
                />
                {brightness !== 0 && (
                  <View style={[ss.overlay, { backgroundColor: brightColor, opacity: brightOpacity }]} />
                )}
                {shadow !== 0 && (
                  <View style={[ss.overlay, { backgroundColor: shadowColor, opacity: shadowOpacity }]} />
                )}
              </Animated.View>
            </GestureDetector>
          </View>

          {/* 滑桿 */}
          <View style={ss.sliders}>
            <Slider value={brightness} min={-1} max={1} label="亮度" themeColor={themeColor} onChange={setBrightness} />
            <Slider value={shadow}     min={-1} max={1} label="陰影" themeColor={themeColor} onChange={setShadow} />
            <Text style={ss.note}>亮度/陰影為預覽效果，不寫入儲存檔</Text>
          </View>

          {/* 導航列 */}
          <View style={ss.navRow}>
            <Pressable onPress={handlePrev} disabled={index === 0} style={ss.navBtn}>
              <Text style={[ss.navTxt, index === 0 && ss.navDisabled]}>上一張</Text>
            </Pressable>

            <Pressable onPress={handleSkip} disabled={applying} style={ss.navBtn}>
              <Text style={[ss.navTxt, applying && ss.navDisabled]}>
                {isLast ? '略過完成' : '跳過'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={applying}
              style={[ss.confirmBtn, { backgroundColor: themeColor }, applying && { opacity: 0.6 }]}
            >
              <Text style={ss.confirmTxt}>
                {applying ? '處理中...' : isLast ? '確認完成' : '確認下一張'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerBtn: { padding: 4 },
  headerTxt: { color: '#fff', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // 3:4 裁切框（overflow: hidden 阻止縮放超出邊界的顯示）
  frameWrap: {
    width: FRAME_W,
    height: FRAME_H,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  imageWrap: {
    width: FRAME_W,
    height: FRAME_H,
  },
  photo: { width: FRAME_W, height: FRAME_H },
  overlay: {
    position: 'absolute', top: 0, left: 0,
    width: FRAME_W, height: FRAME_H,
  },

  sliders: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    backgroundColor: '#1a1a1a', justifyContent: 'center',
  },
  sliderWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderLabel: { color: '#ccc', fontSize: 12, width: 28 },
  track: { height: 4, backgroundColor: '#444', borderRadius: 2, position: 'relative' },
  filled: { height: 4, borderRadius: 2, position: 'absolute', top: 0, left: 0 },
  thumb: { position: 'absolute', top: -8, width: 20, height: 20, borderRadius: 10 },
  sliderVal: { color: '#888', fontSize: 11, width: 32, textAlign: 'right' },
  note: { color: '#555', fontSize: 10, textAlign: 'center' },

  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#1a1a1a', gap: 8,
  },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  navTxt: { color: '#aaa', fontSize: 14 },
  navDisabled: { color: '#444' },
  confirmBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
