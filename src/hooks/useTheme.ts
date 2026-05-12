import { useSettingsStore } from '../stores/settingsStore';
import { DEFAULT_THEME_COLOR } from '../constants/theme';

export function useTheme() {
  const { themeColor, setThemeColor, fontKey, setFontKey, isProUnlocked } = useSettingsStore();

  return {
    themeColor: themeColor || DEFAULT_THEME_COLOR,
    setThemeColor,
    fontKey,
    setFontKey,
    isProUnlocked,
  };
}
