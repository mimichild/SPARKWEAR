import { Tabs } from 'expo-router';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { CLOSET_TAB_LABELS } from '../../../src/constants/defaults';

export default function ClosetTabsLayout() {
  const { themeColor, enabledTabs, tabOrder } = useSettingsStore();

  const tabs = tabOrder.filter((t) => enabledTabs.includes(t));

  return (
    <Tabs
      // 讓分頁返回鍵一律冒泡給外層 Stack 回主頁，而非先跳到第一個分頁
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColor,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { borderTopColor: '#eee' },
        tabBarLabelStyle: { fontSize: 17 },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { paddingTop: 8 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab}
          name={tab === 'items' ? 'index' : tab}
          options={{ title: CLOSET_TAB_LABELS[tab] ?? tab }}
        />
      ))}
    </Tabs>
  );
}
