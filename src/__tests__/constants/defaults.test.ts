import {
  DEFAULT_CATEGORIES,
  DEFAULT_ORIGINS,
  DEFAULT_COLORS,
  DEFAULT_TAB_ORDER,
  DEFAULT_ENABLED_TABS,
  SEASONS,
  GRADES,
  VIP_CODE,
  PHOTO_MAX_FREE,
  PHOTO_MAX_PRO,
  CLOSET_TAB_LABELS,
} from '../../constants/defaults';

describe('defaults — 預設值', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('共有 13 個預設分類', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(13);
    });

    it('包含「未分類」', () => {
      const names = DEFAULT_CATEGORIES.map(c => c.name);
      expect(names).toContain('未分類');
    });

    it('每個分類都有名稱和色碼', () => {
      DEFAULT_CATEGORIES.forEach(cat => {
        expect(cat.name).toBeTruthy();
        expect(cat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('包含全部預期的分類名稱', () => {
      const names = DEFAULT_CATEGORIES.map(c => c.name);
      const expected = ['上衣','裙裝','褲裝','洋裝','外套','套裝','日常','鞋類','包包','猶豫','留校','冷凍','未分類'];
      expected.forEach(name => expect(names).toContain(name));
    });
  });

  describe('DEFAULT_ORIGINS', () => {
    it('共有 5 個預設來源', () => {
      expect(DEFAULT_ORIGINS).toHaveLength(5);
    });

    it('包含日貨/韓貨/品牌/蝦皮/其他', () => {
      expect(DEFAULT_ORIGINS).toContain('日貨');
      expect(DEFAULT_ORIGINS).toContain('韓貨');
      expect(DEFAULT_ORIGINS).toContain('品牌');
      expect(DEFAULT_ORIGINS).toContain('蝦皮');
      expect(DEFAULT_ORIGINS).toContain('其他');
    });
  });

  describe('DEFAULT_COLORS', () => {
    it('共有 15 個預設顏色', () => {
      expect(DEFAULT_COLORS).toHaveLength(15);
    });

    it('包含黑色/白色/灰色', () => {
      expect(DEFAULT_COLORS).toContain('黑色');
      expect(DEFAULT_COLORS).toContain('白色');
      expect(DEFAULT_COLORS).toContain('灰色');
    });
  });

  describe('Tab 設定', () => {
    it('預設 Tab 順序共 4 個', () => {
      expect(DEFAULT_TAB_ORDER).toHaveLength(4);
    });

    it('預設啟用 Tab 共 4 個', () => {
      expect(DEFAULT_ENABLED_TABS).toHaveLength(4);
    });

    it('Tab 標籤對應正確', () => {
      expect(CLOSET_TAB_LABELS['items']).toBe('單品');
      expect(CLOSET_TAB_LABELS['photos']).toBe('照片');
      expect(CLOSET_TAB_LABELS['category']).toBe('分類');
      expect(CLOSET_TAB_LABELS['ranking']).toBe('排行');
    });
  });

  describe('其他常數', () => {
    it('季節共 4 個', () => {
      expect(SEASONS).toHaveLength(4);
    });

    it('分級共 5 個（A-E）', () => {
      expect(GRADES).toHaveLength(5);
      expect(GRADES).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('VIP CODE 正確', () => {
      expect(VIP_CODE).toBe('MIMILOVEYOU520');
    });

    it('免費版最多 5 張照片', () => {
      expect(PHOTO_MAX_FREE).toBe(5);
    });

    it('Pro 版最多 20 張照片', () => {
      expect(PHOTO_MAX_PRO).toBe(20);
    });
  });
});
