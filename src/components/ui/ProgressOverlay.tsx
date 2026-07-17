import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  visible: boolean;
  title?: string;
  progress?: number; // 0–1
  message?: string;
}

// 這裡刻意不用 <Modal>：this screen 常常在關閉另一個 <Modal>（例如照片編輯器）
// 之後緊接著顯示進度條，兩個原生 Modal 幾乎同時 present/dismiss 在 iOS 上
// 會讓畫面卡死不回應。改成一般的絕對定位 View 疊在畫面最上層就不會有這個問題。
export function ProgressOverlay({ visible, title = '處理中...', progress, message }: Props) {
  const { themeColor } = useTheme();
  const pct = progress != null ? Math.round(progress * 100) : null;

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {pct != null ? (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: themeColor }]} />
            </View>
            <Text style={styles.pct}>{pct}%</Text>
          </>
        ) : (
          <ActivityIndicator color={themeColor} style={{ marginVertical: 12 }} />
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 999,
    elevation: 999,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 16, color: '#1a1a1a' },
  track: {
    width: '100%', height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 13, color: '#888', marginTop: 8 },
  message: { fontSize: 12, color: '#aaa', marginTop: 8, textAlign: 'center' },
});
