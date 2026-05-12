import { Stack } from 'expo-router';

export default function ClosetStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="item/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="item/form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="category/[name]" options={{ presentation: 'card' }} />
    </Stack>
  );
}
