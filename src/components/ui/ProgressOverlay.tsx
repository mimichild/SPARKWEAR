import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  visible: boolean;
  title?: string;
  progress?: number; // 0–1
  message?: string;
}

export function ProgressOverlay({ visible, title = '處理中...', progress, message }: Props) {
  const { themeColor } = useTheme();
  const pct = progress != null ? Math.round(progress * 100) : null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
