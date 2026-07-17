/**
 * PhotoEditorModal
 *
 * 功能：
 *   - 雙指縮放 + 單指拖曳（Pinch + Pan）
 *   - 以 3:4 框裁切並儲存（cover 模式）
 *   - 四種調整工具（按鈕選擇後再調整）：旋轉、對比、亮度、陰影
 *   - 有任何調整時用 captureRef 烘焙進最終檔案
 *   - 上一張 / 跳過 / 確認(下一張) / 完成
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet,
  Dimensions, PanResponder, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_W } = Dimensions.get('window');

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

type Tool = 'rotation' | 'contrast' | 'brightness' | 'shadow';

const TOOLS: { key: Tool; label: string }[] = [
  { key: 'rotation',   label: '旋轉' },
  { key: 'contrast',   label: '對比' },
  { key: 'brightness', label: '亮度' },
  { key: 'shadow',     label: '陰影' },
];

// ── 水平滑桿 ────────────────────────────────────────────────────
function Slider({
  value, min, max, label, themeColor, onChange, formatValue,
}: {
  value: number; min: number; max: number;
  label: string; themeColor: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const TRACK_W = SCREEN_W - 140;
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

  const display = formatValue
    ? formatValue(value)
    : `${value >= 0 ? '+' : ''}${Math.round(value * 100)}`;

  return (
    <View style={ss.sliderWrap}>
      <Text style={ss.sliderLabel}>{label}</Text>
      <View style={[ss.track, { width: TRACK_W }]} {...responder.panHandlers}>
        <View style={[ss.filled, { width: thumbX, backgroundColor: themeColor }]} />
        <View style={[ss.thumb, { left: thumbX - 10, backgroundColor: themeColor }]} />
      </View>
      <Text style={ss.sliderVal}>{display}</Text>
    </View>
  );
}

// ── Main ────────────────────────────────────────────────────────
export function PhotoEditorModal({ photos, visible, themeColor, onComplete, onCancel }: Props) {
  const [index, setIndex] = useState(0);
  const [editedUris, setEditedUris] = useState<string[]>(() => photos.map(p => p.uri));
  const [brightness, setBrightness] = useState(0);
  const [shadow, setShadow] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [applying, setApplying] = useState(false);

  const frameRef = useRef<View>(null);

  // ── 手勢 shared values ──────────────────────────────────────
  const scale       = useSharedValue(1);
  const savedScale  = useSharedValue(1);
  const offsetX     = useSharedValue(0);
  const offsetY     = useSharedValue(0);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);
  const rotSV       = useSharedValue(0); // 旋轉角度（deg），用於 animStyle

  const resetAll = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    offsetX.value = withSpring(0);
    offsetY.value = withSpring(0);
    savedOffsetX.value = 0;
    savedOffsetY.value = 0;
    rotSV.value = 0;
    setBrightness(0);
    setShadow(0);
    setContrast(0);
    setRotation(0);
    setActiveTool(null);
  }, [scale, savedScale, offsetX, offsetY, savedOffsetX, savedOffsetY, rotSV]);

  useEffect(() => {
    if (visible && photos.length > 0) {
      setEditedUris(photos.map(p => p.uri));
      setIndex(0);
      setApplying(false);
      resetAll();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 手勢 ──────────────────────────────────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => { scale.value = Math.max(1, savedScale.value * e.scale); })
    .onEnd(() => { savedScale.value = scale.value; });

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
      { rotate: `${rotSV.value}deg` },
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  // ── 旋轉 slider onChange ──────────────────────────────────────
  const handleRotationChange = useCallback((v: number) => {
    const snapped = Math.round(v); // 整數度
    rotSV.value = snapped;
    setRotation(snapped);
  }, [rotSV]);

  // ── 裁切 + 調整，有任何效果時用 captureRef 烘焙 ────────────────
  const applyCrop = useCallback(async (
    uri: string | undefined, imgW: number, imgH: number
  ): Promise<string> => {
    const sourceUri = uri ?? photos[index]?.uri;
    if (!sourceUri) throw new Error('照片 URI 不存在');

    const hasAdjustment = brightness !== 0 || shadow !== 0 || contrast !== 0 || rotation !== 0;
    if (hasAdjustment && frameRef.current) {
      return await captureRef(frameRef, { format: 'jpg', quality: 0.85, result: 'tmpfile' });
    }

    const s = savedScale.value;
    const tx = savedOffsetX.value;
    const ty = savedOffsetY.value;
    const sf = Math.max(FRAME_W / imgW, FRAME_H / imgH);
    // 先算出理論上的裁切框，再用 imgW/imgH 夾住，避免浮點數誤差或
    // 圖片方向資訊落差讓裁切框跑出原圖邊界（native crop 對此會直接丟錯，
    // 且這個錯誤先前沒有被妥善處理，導致 UI 卡死不回應）。
    const rawCropW = FRAME_W / (sf * s);
    const rawCropH = FRAME_H / (sf * s);
    const cropW = Math.min(imgW, Math.max(1, rawCropW));
    const cropH = Math.min(imgH, Math.max(1, rawCropH));
    const rawOriginX = imgW / 2 - cropW / 2 - tx / (sf * s);
    const rawOriginY = imgH / 2 - cropH / 2 - ty / (sf * s);
    const originX = Math.floor(Math.max(0, Math.min(imgW - cropW, rawOriginX)));
    const originY = Math.floor(Math.max(0, Math.min(imgH - cropH, rawOriginY)));
    const width = Math.max(1, Math.floor(Math.min(cropW, imgW - originX)));
    const height = Math.max(1, Math.floor(Math.min(cropH, imgH - originY)));

    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ crop: { originX, originY, width, height } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }, [savedScale, savedOffsetX, savedOffsetY, photos, index, brightness, shadow, contrast, rotation]);

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
      if (index < photos.length - 1) { setIndex(index + 1); resetAll(); }
      else { onComplete(next); }
    } catch (e) {
      Alert.alert('照片處理失敗', e instanceof Error ? e.message : '請重新選擇照片');
    } finally { setApplying(false); }
  }, [index, photos, editedUris, applyCrop, onComplete, resetAll]);

  const handleSkip = useCallback(async () => {
    setApplying(true);
    try {
      const sourceUri = editedUris[index] ?? photos[index]?.uri;
      if (!sourceUri) { setApplying(false); return; }
      const stable = await ImageManipulator.manipulateAsync(
        sourceUri, [], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      ).then(r => r.uri);
      const next = [...editedUris];
      next[index] = stable;
      setEditedUris(next);
      if (index < photos.length - 1) { setIndex(index + 1); resetAll(); }
      else { onComplete(next); }
    } catch (e) {
      Alert.alert('照片處理失敗', e instanceof Error ? e.message : '請重新選擇照片');
    } finally { setApplying(false); }
  }, [index, photos, editedUris, onComplete, resetAll]);

  const handlePrev = useCallback(() => {
    if (index > 0) { setIndex(index - 1); resetAll(); }
  }, [index, resetAll]);

  const handleDone = useCallback(async () => {
    setApplying(true);
    try {
      const stableUris = await Promise.all(
        editedUris.map((uri, i) => {
          if (i <= index) return Promise.resolve(uri);
          return ImageManipulator.manipulateAsync(uri, [], {
            compress: 0.82, format: ImageManipulator.SaveFormat.JPEG,
          }).then(r => r.uri);
        })
      );
      onComplete(stableUris);
    } catch (e) {
      Alert.alert('照片處理失敗', e instanceof Error ? e.message : '請重新選擇照片');
    } finally { setApplying(false); }
  }, [editedUris, index, onComplete]);

  if (!photos.length) return null;

  const current = editedUris[index] ?? photos[index]?.uri;
  const isLast = index === photos.length - 1;

  // 視覺疊加層計算
  const brightColor   = brightness > 0 ? '#fff' : '#000';
  const brightOpacity = Math.abs(brightness) * 0.55;
  const shadowColor   = shadow > 0 ? '#fff' : '#000';
  const shadowOpacity = Math.abs(shadow) * 0.35;
  // 對比：負值→灰色疊層（趨向中灰）；正值→輕微壓暗（強化明暗差）
  const contrastOverlayColor   = contrast < 0 ? '#808080' : '#000';
  const contrastOverlayOpacity = contrast < 0
    ? Math.abs(contrast) * 0.4
    : contrast * 0.12;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
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
          <View ref={frameRef} style={ss.frameWrap} collapsable={false}>
            <GestureDetector gesture={composed}>
              <Animated.View style={[ss.imageWrap, animStyle]}>
                <Image source={{ uri: current }} style={ss.photo} resizeMode="cover" />
                {brightness !== 0 && (
                  <View style={[ss.overlay, { backgroundColor: brightColor, opacity: brightOpacity }]} />
                )}
                {shadow !== 0 && (
                  <View style={[ss.overlay, { backgroundColor: shadowColor, opacity: shadowOpacity }]} />
                )}
                {contrast !== 0 && (
                  <View style={[ss.overlay, { backgroundColor: contrastOverlayColor, opacity: contrastOverlayOpacity }]} />
                )}
              </Animated.View>
            </GestureDetector>
          </View>

          {/* 工具列 + 滑桿 */}
          <View style={ss.controls}>
            {/* 四個工具按鈕 */}
            <View style={ss.toolRow}>
              {TOOLS.map(t => {
                const isActive = activeTool === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={[ss.toolBtn, isActive && { backgroundColor: themeColor, borderColor: themeColor }]}
                    onPress={() => setActiveTool(isActive ? null : t.key)}
                  >
                    <Text style={[ss.toolBtnTxt, isActive && { color: '#fff' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 選定工具的滑桿 */}
            <View style={ss.sliderArea}>
              {activeTool === 'rotation' && (
                <Slider
                  value={rotation} min={-90} max={90}
                  label="旋轉" themeColor={themeColor}
                  onChange={handleRotationChange}
                  formatValue={v => `${v >= 0 ? '+' : ''}${Math.round(v)}°`}
                />
              )}
              {activeTool === 'contrast' && (
                <Slider value={contrast} min={-1} max={1} label="對比" themeColor={themeColor} onChange={setContrast} />
              )}
              {activeTool === 'brightness' && (
                <Slider value={brightness} min={-1} max={1} label="亮度" themeColor={themeColor} onChange={setBrightness} />
              )}
              {activeTool === 'shadow' && (
                <Slider value={shadow} min={-1} max={1} label="陰影" themeColor={themeColor} onChange={setShadow} />
              )}
              {activeTool === null && (
                <Text style={ss.toolHint}>點選上方工具後拖動滑桿調整</Text>
              )}
            </View>
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

  frameWrap: {
    width: FRAME_W, height: FRAME_H,
    overflow: 'hidden', backgroundColor: '#000',
  },
  imageWrap: { width: FRAME_W, height: FRAME_H },
  photo: { width: FRAME_W, height: FRAME_H },
  overlay: {
    position: 'absolute', top: 0, left: 0,
    width: FRAME_W, height: FRAME_H,
  },

  // 工具區
  controls: {
    flex: 1, backgroundColor: '#1a1a1a',
    paddingVertical: 10, justifyContent: 'center',
  },
  toolRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 10, paddingHorizontal: 16, marginBottom: 12,
  },
  toolBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#555',
  },
  toolBtnTxt: { color: '#ccc', fontSize: 13, fontWeight: '500' },

  sliderArea: {
    minHeight: 36, justifyContent: 'center',
    paddingHorizontal: 16,
  },
  toolHint: { color: '#555', fontSize: 11, textAlign: 'center' },

  sliderWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderLabel: { color: '#ccc', fontSize: 12, width: 28 },
  track: { height: 4, backgroundColor: '#444', borderRadius: 2, position: 'relative' },
  filled: { height: 4, borderRadius: 2, position: 'absolute', top: 0, left: 0 },
  thumb: { position: 'absolute', top: -8, width: 20, height: 20, borderRadius: 10 },
  sliderVal: { color: '#888', fontSize: 11, width: 40, textAlign: 'right' },

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
