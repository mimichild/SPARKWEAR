import { COMPRESSION_PROFILES } from '../../constants/compression';

describe('compression — 壓縮 profile', () => {
  it('共有 4 個 profile', () => {
    expect(Object.keys(COMPRESSION_PROFILES)).toHaveLength(4);
  });

  describe('thumb', () => {
    const p = COMPRESSION_PROFILES['thumb'];
    it('寬 320px', () => expect(p.width).toBe(320));
    it('高 427px', () => expect(p.height).toBe(427));
    it('品質 0.66', () => expect(p.quality).toBe(0.66));
  });

  describe('grid', () => {
    const p = COMPRESSION_PROFILES['grid'];
    it('寬 720px', () => expect(p.width).toBe(720));
    it('高 960px', () => expect(p.height).toBe(960));
    it('品質 0.76', () => expect(p.quality).toBe(0.76));
  });

  describe('detail', () => {
    const p = COMPRESSION_PROFILES['detail'];
    it('寬 1080px', () => expect(p.width).toBe(1080));
    it('高 1440px', () => expect(p.height).toBe(1440));
    it('品質 0.82', () => expect(p.quality).toBe(0.82));
  });

  describe('backup-lite', () => {
    const p = COMPRESSION_PROFILES['backup-lite'];
    it('長邊上限 1600px', () => expect(p.maxLongEdge).toBe(1600));
    it('品質 0.86', () => expect(p.quality).toBe(0.86));
    it('不指定固定尺寸（非裁切模式）', () => {
      expect(p.width).toBeUndefined();
      expect(p.height).toBeUndefined();
    });
  });

  it('所有 profile 品質介於 0 到 1 之間', () => {
    Object.values(COMPRESSION_PROFILES).forEach(p => {
      expect(p.quality).toBeGreaterThan(0);
      expect(p.quality).toBeLessThanOrEqual(1);
    });
  });
});
