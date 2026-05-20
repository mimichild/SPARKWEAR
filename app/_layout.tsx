import { useEffect } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore, resolveFontFamily } from '../src/stores/settingsStore';
import { SQLiteProvider, DB_NAME, initDatabase } from '../src/db/provider';

export default function RootLayout() {
  const { hydrate, themeColor, fontKey } = useSettingsStore();
  const fontFamily = resolveFontFamily(fontKey);

  useEffect(() => {
    hydrate();
  }, []);

  // 全域套用字型：設定 Text.defaultProps 讓所有 Text 元件繼承
  useEffect(() => {
    (Text as unknown as { defaultProps: Record<string, unknown> }).defaultProps ??= {};
    (Text as unknown as { defaultProps: Record<string, unknown> }).defaultProps.style =
      fontFamily ? { fontFamily } : {};
  }, [fontFamily]);

  return (
    // fontKey 作為 key，字型變更時強制重新渲染整棵樹
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
