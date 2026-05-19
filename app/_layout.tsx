import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore } from '../src/stores/settingsStore';
// Platform-specific: .web.ts skips SQLite import entirely (avoids wasm bundling)
import { SQLiteProvider, DB_NAME, initDatabase } from '../src/db/provider';

export default function RootLayout() {
  const { hydrate, themeColor } = useSettingsStore();

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
