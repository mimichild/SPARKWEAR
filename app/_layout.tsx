import { useEffect } from 'react';
import { Text as RNText } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';
import { useSettingsStore, resolveFontFamily } from '../src/stores/settingsStore';
import { SQLiteProvider, DB_NAME, initDatabase } from '../src/db/provider';
import { useSQLiteContext } from '../src/db/context';
import { cleanupExpiredTrash } from '../src/services/itemService';
import { fetchProStatus } from '../src/services/purchases';

mobileAds().initialize();

// ── 全域字型注入 ───────────────────────────────────────────────
// Text.defaultProps.style 只對無 style prop 的 Text 有效；
// 正確做法：patch jsx-runtime，讓每個 <Text> 在 style 陣列最前面
// 插入 fontFamily，這樣即使 StyleSheet 有其他樣式也不會覆蓋字型。
function patchJsxRuntime() {
  function injectFont(type: unknown, props: Record<string, unknown> | null) {
    if (type !== RNText || !props) return props;
    const fontFamily = resolveFontFamily(
      (useSettingsStore.getState() as { fontKey: string }).fontKey
    );
    if (!fontFamily) return props;
    const s = props.style;
    return {
      ...props,
      style: s
        ? [{ fontFamily }, ...(Array.isArray(s) ? s : [s])]
        : { fontFamily },
    };
  }

  // 開發環境用 jsx-dev-runtime，正式環境用 jsx-runtime，兩者都 patch
  const runtimes = [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react/jsx-runtime'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react/jsx-dev-runtime'),
  ] as Array<Record<string, unknown>>;

  for (const rt of runtimes) {
    for (const fn of ['jsx', 'jsxs', 'jsxDEV'] as const) {
      if (typeof rt[fn] !== 'function') continue;
      const orig = rt[fn] as (t: unknown, p: unknown, ...r: unknown[]) => unknown;
      rt[fn] = (type: unknown, props: Record<string, unknown> | null, ...rest: unknown[]) =>
        orig(type, injectFont(type, props), ...rest);
    }
  }
}

patchJsxRuntime();
// ─────────────────────────────────────────────────────────────

function TrashCleanup() {
  const db = useSQLiteContext();
  useEffect(() => { cleanupExpiredTrash(db).catch(() => {}); }, [db]);
  return null;
}

export default function RootLayout() {
  const { hydrate, themeColor, fontKey, setProUnlocked } = useSettingsStore();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    // RevenueCat 尚未設定（沒有 API Key）時回傳 null，維持本機既有的 Pro 狀態
    // （例如 VIP 兌換碼解鎖的結果），不要用 null 把它蓋掉。
    fetchProStatus().then(isPro => {
      if (isPro != null) setProUnlocked(isPro);
    });
  }, []);

  return (
    // SQLiteProvider 不放在 key 裡，避免 fontKey 變更時關閉資料庫連線
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase}>
          <TrashCleanup />
          <StatusBar style="auto" backgroundColor={themeColor} />
          {/* key={fontKey} 只套在 Stack 上，字型切換時重設導航狀態，但不重建 DB */}
          <Stack key={fontKey} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="closet" />
            <Stack.Screen name="outfits" />
            <Stack.Screen name="settings/index" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings/trash" options={{ presentation: 'modal' }} />
          </Stack>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
