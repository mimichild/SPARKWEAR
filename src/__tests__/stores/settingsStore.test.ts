import { useSettingsStore } from '../../stores/settingsStore';
import { DEFAULT_THEME_COLOR, DEFAULT_FONT_KEY } from '../../constants/theme';
import { DEFAULT_TAB_ORDER, DEFAULT_ENABLED_TABS } from '../../constants/defaults';

// Clear AsyncStorage mock before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('settingsStore', () => {
  describe('初始狀態', () => {
    it('主題色預設為 #f1aba7', () => {
      expect(useSettingsStore.getState().themeColor).toBe(DEFAULT_THEME_COLOR);
    });

    it('字體預設為 default', () => {
      expect(useSettingsStore.getState().fontKey).toBe(DEFAULT_FONT_KEY);
    });

    it('Pro 預設未解鎖', () => {
      expect(useSettingsStore.getState().isProUnlocked).toBe(false);
    });

    it('Tab 順序預設正確', () => {
      expect(useSettingsStore.getState().tabOrder).toEqual([...DEFAULT_TAB_ORDER]);
    });

    it('啟用 Tab 預設正確', () => {
      expect(useSettingsStore.getState().enabledTabs).toEqual([...DEFAULT_ENABLED_TABS]);
    });

    it('購買排序預設 desc', () => {
      expect(useSettingsStore.getState().purchaseSort).toBe('desc');
    });

    it('穿搭排序預設 desc', () => {
      expect(useSettingsStore.getState().outfitSort).toBe('desc');
    });

    it('排行週期預設 month', () => {
      expect(useSettingsStore.getState().rankingPeriod).toBe('month');
    });
  });

  describe('主題色', () => {
    it('setThemeColor 更新主題色', async () => {
      await useSettingsStore.getState().setThemeColor('#7c2d40');
      expect(useSettingsStore.getState().themeColor).toBe('#7c2d40');
    });

    it('setThemeColor 呼叫 AsyncStorage.setItem', async () => {
      const AsyncStorage = require('../../__mocks__/async-storage').default;
      await useSettingsStore.getState().setThemeColor('#bcd7f1');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Pro 解鎖', () => {
    it('setProUnlocked(true) 解鎖 Pro', async () => {
      await useSettingsStore.getState().setProUnlocked(true);
      expect(useSettingsStore.getState().isProUnlocked).toBe(true);
    });

    it('setProUnlocked(false) 取消解鎖', async () => {
      await useSettingsStore.getState().setProUnlocked(true);
      await useSettingsStore.getState().setProUnlocked(false);
      expect(useSettingsStore.getState().isProUnlocked).toBe(false);
    });
  });

  describe('排行週期', () => {
    it.each(['month', 'quarter', 'year', 'rolling', 'all'] as const)(
      'setRankingPeriod(%s) 設定成功',
      async (period) => {
        await useSettingsStore.getState().setRankingPeriod(period);
        expect(useSettingsStore.getState().rankingPeriod).toBe(period);
      }
    );
  });

  describe('排序', () => {
    it('setPurchaseSort asc', async () => {
      await useSettingsStore.getState().setPurchaseSort('asc');
      expect(useSettingsStore.getState().purchaseSort).toBe('asc');
    });

    it('setOutfitSort asc', async () => {
      await useSettingsStore.getState().setOutfitSort('asc');
      expect(useSettingsStore.getState().outfitSort).toBe('asc');
    });
  });
});
