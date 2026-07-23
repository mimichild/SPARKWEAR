import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/stores/settingsStore';
import { APP_VERSION } from '../src/constants/defaults';
import { AdBanner } from '../src/components/AdBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { themeColor } = useSettingsStore();

  return (
    <View style={[styles.screen, { backgroundColor: themeColor }]}>
      <View style={styles.container}>
        <Text style={styles.title}>SPARK WEAR</Text>
        <Text style={styles.version}>v{APP_VERSION}</Text>

        <Pressable style={styles.btn} onPress={() => router.push('/closet')}>
          <Text style={styles.btnText}>我的衣櫃</Text>
        </Pressable>

        <Pressable style={styles.btn} onPress={() => router.push('/outfits')}>
          <Text style={styles.btnText}>穿搭紀錄</Text>
        </Pressable>

        <View style={styles.tools}>
          <Pressable style={styles.miniBtn} onPress={() => router.push('/settings')}>
            <Text style={styles.miniBtnText}>設定</Text>
          </Pressable>
        </View>
      </View>

      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 48,
  },
  btn: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  tools: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  miniBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  miniBtnText: {
    fontSize: 13,
    color: '#fff',
  },
});
