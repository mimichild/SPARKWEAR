import { useEffect } from 'react';
import { Text as RNText } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore, resolveFontFamily } from '../src/stores/settingsStore';
import { SQLiteProvider, DB_NAME, initDatabase } from '../src/db/provider';

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

export default function RootLayout() {
  const { hydrate, themeColor, fontKey } = useSettingsStore();

  useEffect(() => {
    hydrate();
  }, []);

  return (
    // fontKey 作為 key：字型變更時強制整棵樹重新渲染，立即看到效果
    <GestureHandlerRootView key={fontKey} style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase}>
          <StatusBar style="auto" backgroundColor={themeColor} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="closet" />
            <Stack.Screen name="outfits" />
            <Stack.Screen name="settings/index" options={{ presentation: 'modal' }} />
          </Stack>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
