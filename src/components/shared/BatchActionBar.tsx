import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  count: number;
  onDelete: () => void;
  onRecategorize?: () => void;
  onCancel: () => void;
  themeColor: string;
}

export function BatchActionBar({ count, onDelete, onRecategorize, onCancel, themeColor }: Props) {
  if (count === 0) return null;
  return (
    <View style={styles.bar}>
      <Pressable onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>取消</Text>
      </Pressable>
      <Text style={styles.countText}>已選 {count} 件</Text>
      <View style={styles.actions}>
        {onRecategorize && (
          <Pressable onPress={onRecategorize} style={[styles.actionBtn, { borderColor: themeColor }]}>
            <Text style={[styles.actionBtnText, { color: themeColor }]}>重新分類</Text>
          </Pressable>
        )}
        <Pressable onPress={onDelete} style={[styles.actionBtn, styles.deleteBtn]}>
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>移至暫存區</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8e4de',
    gap: 8,
  },
  cancelBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  cancelText: { fontSize: 13, color: '#888' },
  countText: { flex: 1, fontSize: 13, color: '#555', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  deleteBtn: { borderColor: '#e57373' },
  deleteBtnText: { color: '#e57373' },
});
