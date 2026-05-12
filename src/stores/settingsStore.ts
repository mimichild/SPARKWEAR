import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME_COLOR, DEFAULT_FONT_KEY } from '../constants/theme';
import { DEFAULT_TAB_ORDER, DEFAULT_ENABLED_TABS } from '../constants/defaults';
import type { AppSettings, SortOrder, RankingPeriod } from '../types';

interface SettingsState extends AppSettings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemeColor: (color: string) => Promise<void>;
  setFontKey: (key: string) => Promise<void>;
  setProUnlocked: (value: boolean) => Promise<void>;
  setTabOrder: (order: string[]) => Promise<void>;
  setEnabledTabs: (tabs: string[]) => Promise<void>;
  setPurchaseSort: (sort: SortOrder) => Promise<void>;
  setOutfitSort: (sort: SortOrder) => Promise<void>;
  setRankingPeriod: (period: RankingPeriod) => Promise<void>;
}

const STORAGE_KEY = '@sparkwear_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: false,
  themeColor: DEFAULT_THEME_COLOR,
  fontKey: DEFAULT_FONT_KEY,
  isProUnlocked: false,
  tabOrder: [...DEFAULT_TAB_ORDER],
  enabledTabs: [...DEFAULT_ENABLED_TABS],
  purchaseSort: 'desc',
  photoSort: 'desc',
  outfitSort: 'desc',
  rankingPeriod: 'month',

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: Partial<AppSettings> = JSON.parse(raw);
        set({ ...saved, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  setThemeColor: async (color) => {
    set({ themeColor: color });
    await persist(get());
  },
  setFontKey: async (key) => {
    set({ fontKey: key });
    await persist(get());
  },
  setProUnlocked: async (value) => {
    set({ isProUnlocked: value });
    await persist(get());
  },
  setTabOrder: async (order) => {
    set({ tabOrder: order });
    await persist(get());
  },
  setEnabledTabs: async (tabs) => {
    set({ enabledTabs: tabs });
    await persist(get());
  },
  setPurchaseSort: async (sort) => {
    set({ purchaseSort: sort });
    await persist(get());
  },
  setOutfitSort: async (sort) => {
    set({ outfitSort: sort });
    await persist(get());
  },
  setRankingPeriod: async (period) => {
    set({ rankingPeriod: period });
    await persist(get());
  },
}));

async function persist(state: SettingsState) {
  const { hydrated, hydrate, setThemeColor, setFontKey, setProUnlocked,
    setTabOrder, setEnabledTabs, setPurchaseSort, setOutfitSort,
    setRankingPeriod, ...data } = state;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
