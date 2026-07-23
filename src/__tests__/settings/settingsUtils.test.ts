import {
  moveTabUp,
  moveTabDown,
  toggleTab,
  formatBytes,
} from '../../utils/settingsUtils';

describe('settingsUtils — 設定相關工具', () => {
  describe('moveTabUp', () => {
    it('index 0 不變動（已在最頂端）', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabUp(order, 0);
      expect(result).toEqual(['items', 'photos', 'category', 'ranking']);
    });

    it('將第二個位置上移到第一個', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabUp(order, 1);
      expect(result).toEqual(['photos', 'items', 'category', 'ranking']);
    });

    it('將最後一個上移', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabUp(order, 3);
      expect(result).toEqual(['items', 'photos', 'ranking', 'category']);
    });

    it('回傳新陣列（不直接修改原本的陣列）', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabUp(order, 1);
      expect(result).not.toBe(order);
      expect(order).toEqual(['items', 'photos', 'category', 'ranking']);
    });

    it('負數 index 不變動', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabUp(order, -1);
      expect(result).toEqual(order);
    });
  });

  describe('moveTabDown', () => {
    it('最後一個位置不變動', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabDown(order, 3);
      expect(result).toEqual(['items', 'photos', 'category', 'ranking']);
    });

    it('將第一個位置下移', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabDown(order, 0);
      expect(result).toEqual(['photos', 'items', 'category', 'ranking']);
    });

    it('將中間位置下移', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabDown(order, 1);
      expect(result).toEqual(['items', 'category', 'photos', 'ranking']);
    });

    it('回傳新陣列（不直接修改原本的陣列）', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabDown(order, 0);
      expect(result).not.toBe(order);
      expect(order).toEqual(['items', 'photos', 'category', 'ranking']);
    });

    it('超過長度的 index 不變動', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      const result = moveTabDown(order, 99);
      expect(result).toEqual(order);
    });

    it('超出上界的 index 不變動（moveTabUp）', () => {
      const order = ['items', 'photos', 'category', 'ranking'];
      expect(moveTabUp(order, order.length)).toEqual(order);
    });
  });

  describe('toggleTab', () => {
    it('停用已啟用的 tab', () => {
      const enabled = ['items', 'photos', 'category', 'ranking'];
      const result = toggleTab(enabled, 'photos');
      expect(result).toEqual(['items', 'category', 'ranking']);
    });

    it('重新啟用未啟用的 tab', () => {
      const enabled = ['items', 'category'];
      const result = toggleTab(enabled, 'photos');
      expect(result).toContain('photos');
      expect(result).toContain('items');
      expect(result).toContain('category');
    });

    it('禁止停用最後一個啟用中的 tab', () => {
      const enabled = ['items'];
      const result = toggleTab(enabled, 'items');
      expect(result).toEqual(['items']);
    });

    it('回傳新陣列（不直接修改原本的陣列）', () => {
      const enabled = ['items', 'photos'];
      const result = toggleTab(enabled, 'photos');
      expect(result).not.toBe(enabled);
      expect(enabled).toEqual(['items', 'photos']);
    });

    it('停用後保留其他 tab 的相對順序', () => {
      const enabled = ['items', 'photos', 'category'];
      const result = toggleTab(enabled, 'photos');
      expect(result).toEqual(['items', 'category']);
    });

    it('空陣列傳入時新增 tab', () => {
      const result = toggleTab([], 'items');
      expect(result).toEqual(['items']);
    });
  });

  describe('formatBytes', () => {
    it('0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('999 B', () => {
      expect(formatBytes(999)).toBe('999 B');
    });

    it('1 KB (1024 bytes)', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
    });

    it('456 KB', () => {
      const bytes = Math.round(456 * 1024);
      expect(formatBytes(bytes)).toMatch(/^456\.0 KB$/);
    });

    it('1 MB (1024 * 1024 bytes)', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    });

    it('12.3 MB（約）', () => {
      const bytes = Math.round(12.3 * 1024 * 1024);
      expect(formatBytes(bytes)).toMatch(/^12\.3 MB$/);
    });

    it('1 GB', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('1023 B（KB 邊界下）', () => {
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('1025 B（KB 邊界上，進入 KB）', () => {
      expect(formatBytes(1025)).toMatch(/^1\.0 KB$/);
    });

    it('KB/MB 邊界下：1024 * 1024 - 1', () => {
      expect(formatBytes(1024 * 1024 - 1)).toMatch(/KB$/);
    });

    it('負數回傳 0 B', () => {
      expect(formatBytes(-1)).toBe('0 B');
    });

    it('NaN 回傳 0 B', () => {
      expect(formatBytes(NaN)).toBe('0 B');
    });

    it('Infinity 回傳 0 B', () => {
      expect(formatBytes(Infinity)).toBe('0 B');
    });
  });
});
