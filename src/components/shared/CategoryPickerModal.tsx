import { View, Text, Pressable, Modal, StyleSheet, FlatList } from 'react-native';
import type { Category } from '../../types';

interface Props {
  visible: boolean;
  categories: Category[];
  onSelect: (categoryId: string) => void;
  onCancel: () => void;
  themeColor: string;
}

export function CategoryPickerModal({ visible, categories, onSelect, onCancel, themeColor }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>選擇分類</Text>
          <Pressable onPress={onCancel} style={styles.closeBtn}>
            <Text style={styles.closeText}>取消</Text>
          </Pressable>
        </View>
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          renderItem={({ item: cat }) => (
            <Pressable style={styles.row} onPress={() => onSelect(cat.id)}>
              <Text style={styles.catName}>{cat.name}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0ede8',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  closeBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  closeText: { fontSize: 14, color: '#888' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f8f6f4',
    gap: 12,
  },
  catName: { fontSize: 15, color: '#333' },
});
