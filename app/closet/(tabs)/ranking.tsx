import { View, Text, StyleSheet } from 'react-native';

export default function RankingTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>排行（Phase 3 實作）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf9f7' },
  placeholder: { color: '#aaa', fontSize: 14 },
});
