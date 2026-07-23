import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { CLOSET_TAB_LABELS } from '../../../src/constants/defaults';
import { AdBanner } from '../../../src/components/AdBanner';

export default function ClosetTabsLayout() {
  const { themeColor, enabledTabs, tabOrder } = useSettingsStore();

  const tabs = tabOrder.filter((t) => enabledTabs.includes(t));

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        // 讓分頁返回鍵一律冒泡給外層 Stack 回主頁，而非先跳到第一個分頁
        backBehavior="none"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themeColor,
          tabBarInactiveTintColor: '#999',
          // 分頁列下方接了 AdBanner，不是螢幕最底部，所以不需要 react-navigation
          // 預設幫分頁列保留的底部安全區高度（會讓整條分頁列被墊高、文字偏上）。
          tabBarStyle: { borderTopColor: '#eee', height: 50, paddingBottom: 0, paddingTop: 0 },
          // lineHeight 跟分頁列的 height 對齊，才能真的把文字垂直置中——react-navigation
          // 預設的 label 版面會保留給圖示的空間，光靠 tabBarItemStyle 的 justifyContent 頂不掉。
          tabBarLabelStyle: { fontSize: 17, includeFontPadding: false, lineHeight: 50, margin: 0 },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: 'none', width: 0, height: 0 },
          tabBarItemStyle: { height: 50, paddingVertical: 0 },
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

      {/* 廣告放在分頁列下方，四個分頁（單品/照片/分類/排行）共用同一條，不重複放在各分頁裡 */}
      <AdBanner />
    </View>
  );
}
