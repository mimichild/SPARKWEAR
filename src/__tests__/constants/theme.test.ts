import { THEME_PRESETS, DEFAULT_THEME_COLOR, APP_FONT_OPTIONS, DEFAULT_FONT_KEY } from '../../constants/theme';

describe('theme — 主題設定', () => {
  describe('THEME_PRESETS', () => {
    it('共有 12 個預設主題色', () => {
      expect(THEME_PRESETS).toHaveLength(12);
    });

    it('每個預設都有標籤和有效色碼', () => {
      THEME_PRESETS.forEach(preset => {
        expect(preset.label).toBeTruthy();
        expect(preset.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('預設主題色 #f1aba7 在清單中', () => {
      const colors = THEME_PRESETS.map(p => p.color);
      expect(colors).toContain('#f1aba7');
    });
  });

  describe('DEFAULT_THEME_COLOR', () => {
    it('預設主題色為 #f1aba7（櫻花粉）', () => {
      expect(DEFAULT_THEME_COLOR).toBe('#f1aba7');
    });
  });

  describe('APP_FONT_OPTIONS', () => {
    it('至少有 10 種字體可選', () => {
      expect(APP_FONT_OPTIONS.length).toBeGreaterThanOrEqual(10);
    });

    it('每種字體都有 key、label、css', () => {
      APP_FONT_OPTIONS.forEach(font => {
        expect(font.key).toBeTruthy();
        expect(font.label).toBeTruthy();
        expect(font.css).toBeTruthy();
      });
    });

    it('default 字體存在', () => {
      const keys = APP_FONT_OPTIONS.map(f => f.key);
      expect(keys).toContain('default');
    });
  });

  describe('DEFAULT_FONT_KEY', () => {
    it('預設字體為 default', () => {
      expect(DEFAULT_FONT_KEY).toBe('default');
    });
  });
});
