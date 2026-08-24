import { filterByPeriod, filterByCategory, sortByMetric, calcCP, calcDaysUnused } from '../../hooks/useRanking';
import type { Item } from '../../types';

const base: Omit<Item, 'id' | 'name' | 'purchaseDate'> = {
  usageCount: 0,
  colorIds: [],
  seasons: [],
  photoIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeItem(overrides: Partial<Item> & { id: string; name: string }): Item {
  return { ...base, usageCount: 0, purchaseDate: '2026-05-01', ...overrides };
}

const REF = new Date('2026-05-13');

// ─── filterByPeriod ──────────────────────────────────────────────────────────

describe('filterByPeriod', () => {
  const items: Item[] = [
    makeItem({ id: '1', name: 'A', purchaseDate: '2026-05-10' }),  // 當月
    makeItem({ id: '2', name: 'B', purchaseDate: '2026-04-01' }),  // 當季(Q2)
    makeItem({ id: '3', name: 'C', purchaseDate: '2026-01-15' }),  // 當年 Q1
    makeItem({ id: '4', name: 'D', purchaseDate: '2025-06-01' }),  // 年度(rolling 12m)
    makeItem({ id: '5', name: 'E', purchaseDate: '2025-04-30' }),  // 超過 rolling
    makeItem({ id: '6', name: 'F', purchaseDate: undefined }),     // 無購買日期
  ];

  it('month：只留當月', () => {
    const r = filterByPeriod(items, 'month', REF);
    expect(r.map(i => i.id)).toEqual(['1']);
  });

  it('quarter：留當季（Q2 = 4-6月）', () => {
    const r = filterByPeriod(items, 'quarter', REF);
    expect(r.map(i => i.id)).toEqual(['1', '2']);
  });

  it('year：留當年', () => {
    const r = filterByPeriod(items, 'year', REF);
    expect(r.map(i => i.id)).toEqual(['1', '2', '3']);
  });

  it('rolling：留近 12 個月', () => {
    const r = filterByPeriod(items, 'rolling', REF);
    // 2025-05-13 ~ 2026-05-13：包含 5,6,1,2,3；不包含 2025-04-30
    expect(r.map(i => i.id)).toEqual(['1', '2', '3', '4']);
  });

  it('all：全部（無日期也包含）', () => {
    const r = filterByPeriod(items, 'all', REF);
    expect(r).toHaveLength(6);
  });
});

// ─── filterByCategory ──────────────────────────────────────────────────────

describe('filterByCategory', () => {
  const items: Item[] = [
    makeItem({ id: '1', name: 'A', categoryId: 'cat-top' }),
    makeItem({ id: '2', name: 'B', categoryId: 'cat-skirt' }),
    makeItem({ id: '3', name: 'C', categoryId: 'cat-top' }),
    makeItem({ id: '4', name: 'D' }), // 未分類
  ];

  it('categoryIds 為空陣列：不篩選，回傳全部', () => {
    const r = filterByCategory(items, []);
    expect(r).toHaveLength(4);
  });

  it('單一分類：只留該分類的單品', () => {
    const r = filterByCategory(items, ['cat-top']);
    expect(r.map(i => i.id)).toEqual(['1', '3']);
  });

  it('多個分類（多選）：留任一符合的單品', () => {
    const r = filterByCategory(items, ['cat-top', 'cat-skirt']);
    expect(r.map(i => i.id)).toEqual(['1', '2', '3']);
  });

  it('未分類的單品在有指定分類時被排除', () => {
    const r = filterByCategory(items, ['cat-top']);
    expect(r.map(i => i.id)).not.toContain('4');
  });
});

// ─── calcCP ──────────────────────────────────────────────────────────────────

describe('calcCP', () => {
  it('用 discountPrice 優先', () => {
    const item = makeItem({ id: '1', name: 'A', originalPrice: 1000, specialPrice: 800, discountPrice: 600, usageCount: 3 });
    expect(calcCP(item)).toBeCloseTo(200);
  });

  it('fallback specialPrice', () => {
    const item = makeItem({ id: '1', name: 'A', originalPrice: 1000, specialPrice: 800, usageCount: 4 });
    expect(calcCP(item)).toBeCloseTo(200);
  });

  it('fallback originalPrice', () => {
    const item = makeItem({ id: '1', name: 'A', originalPrice: 900, usageCount: 3 });
    expect(calcCP(item)).toBeCloseTo(300);
  });

  it('usageCount 為 0 → 回傳 Infinity', () => {
    const item = makeItem({ id: '1', name: 'A', originalPrice: 500, usageCount: 0 });
    expect(calcCP(item)).toBe(Infinity);
  });

  it('無任何價格 → 回傳 Infinity', () => {
    const item = makeItem({ id: '1', name: 'A', usageCount: 5 });
    expect(calcCP(item)).toBe(Infinity);
  });
});

// ─── calcDaysUnused ────────────────────────────────────────────────────────────

describe('calcDaysUnused', () => {
  const now = new Date('2026-05-13T00:00:00.000Z');

  it('有最近使用日期：從該日期算到現在', () => {
    const item = makeItem({ id: '1', name: 'A', purchaseDate: '2026-01-01' });
    expect(calcDaysUnused(item, '2026-05-03', now)).toBe(10);
  });

  it('從未使用：fallback 用購買日期', () => {
    const item = makeItem({ id: '1', name: 'A', purchaseDate: '2026-04-13' });
    expect(calcDaysUnused(item, undefined, now)).toBe(30);
  });

  it('從未使用且無購買日期：fallback 用建立日期', () => {
    const item = makeItem({
      id: '1', name: 'A', purchaseDate: undefined, createdAt: '2026-05-08T00:00:00.000Z',
    });
    expect(calcDaysUnused(item, undefined, now)).toBe(5);
  });

  it('不會回傳負數（未來日期防呆）', () => {
    const item = makeItem({ id: '1', name: 'A', purchaseDate: '2026-06-01' });
    expect(calcDaysUnused(item, undefined, now)).toBe(0);
  });
});

// ─── sortByMetric ─────────────────────────────────────────────────────────────

describe('sortByMetric', () => {
  const items: Item[] = [
    makeItem({ id: 'a', name: 'A', usageCount: 2, originalPrice: 500 }),
    makeItem({ id: 'b', name: 'B', usageCount: 5, originalPrice: 200 }),
    makeItem({ id: 'c', name: 'C', usageCount: 1, originalPrice: 800 }),
  ];

  const voteCounts: Record<string, number> = { a: 3, b: 0, c: 0 };

  it('usage desc（預設）：usageCount + voteCount 高到低', () => {
    // a: 2+3=5, b: 5+0=5, c: 1+0=1 → b,a,c（同分時 usageCount 高者優先：b=5 > a=2）
    const r = sortByMetric(items, 'usage', voteCounts, 'desc');
    expect(r.map(i => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('usage asc：usageCount + voteCount 低到高', () => {
    const r = sortByMetric(items, 'usage', voteCounts, 'asc');
    expect(r.map(i => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('price desc：originalPrice 高到低', () => {
    const r = sortByMetric(items, 'price', {}, 'desc');
    expect(r.map(i => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('price asc：originalPrice 低到高（無價格排最後）', () => {
    const noPrice = makeItem({ id: 'd', name: 'D', usageCount: 0 });
    const r = sortByMetric([...items, noPrice], 'price', {}, 'asc');
    expect(r.map(i => i.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('cp desc (↑)：最划算排前（price/use 最低），Infinity 排最後', () => {
    // a: 500/2=250, b: 200/5=40, c: 800/1=800 → b最划算, a次之, c最貴
    const r = sortByMetric(items, 'cp', {}, 'desc');
    expect(r.map(i => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('cp asc (↓)：最不划算排前（price/use 最高），Infinity 排最後', () => {
    // c=800, a=250, b=40 → c,a,b
    const r = sortByMetric(items, 'cp', {}, 'asc');
    expect(r.map(i => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('cp：usageCount=0 → Infinity → 排最後（不論 asc/desc）', () => {
    const zero = makeItem({ id: 'z', name: 'Z', usageCount: 0, originalPrice: 100 });
    const r = sortByMetric([...items, zero], 'cp', {}, 'asc');
    expect(r[r.length - 1].id).toBe('z');
  });

  it('brand_count desc：品牌數量多的排前面', () => {
    const branded = [
      makeItem({ id: '1', name: 'A', brand: 'ZARA' }),
      makeItem({ id: '2', name: 'B', brand: 'ZARA' }),
      makeItem({ id: '3', name: 'C', brand: 'UNIQLO' }),
    ];
    const r = sortByMetric(branded, 'brand_count', {}, 'desc');
    // ZARA:2 排前，UNIQLO:1 排後
    expect(r.slice(0, 2).map(i => i.brand)).toEqual(['ZARA', 'ZARA']);
    expect(r[2].brand).toBe('UNIQLO');
  });

  it('brand_count：沒有品牌的排最後', () => {
    const items2 = [
      makeItem({ id: '1', name: 'A', brand: 'ZARA' }),
      makeItem({ id: '2', name: 'B' }), // no brand
    ];
    const r = sortByMetric(items2, 'brand_count', {}, 'desc');
    expect(r[r.length - 1].brand).toBeUndefined();
  });

  it('color_count：沒有顏色的排最後', () => {
    const items3 = [
      makeItem({ id: '1', name: 'A', colorIds: ['black'] }),
      makeItem({ id: '2', name: 'B', colorIds: [] }),
    ];
    const r = sortByMetric(items3, 'color_count', {}, 'desc');
    expect(r[0].id).toBe('1');
    expect(r[1].id).toBe('2');
  });

  it('days_unused desc（預設）：最久沒穿的在最上面', () => {
    // 相對天數：1 最近使用（3天前）、2 從沒使用過（購買日最早，天數最多）、3 使用日較早（12天前）
    const items4 = [
      makeItem({ id: '1', name: 'A', purchaseDate: '2026-05-01' }),
      makeItem({ id: '2', name: 'B', purchaseDate: '2026-01-01' }),
      makeItem({ id: '3', name: 'C', purchaseDate: '2026-05-01' }),
    ];
    const lastUsedDates = { '1': '2026-05-10', '3': '2026-05-01' };
    const sorted = sortByMetric(items4, 'days_unused', {}, 'desc', lastUsedDates);
    expect(sorted.map(i => i.id)).toEqual(['2', '3', '1']);
  });

  it('days_unused asc：最近穿過的在最上面', () => {
    const items4 = [
      makeItem({ id: '1', name: 'A', purchaseDate: '2026-05-01' }),
      makeItem({ id: '2', name: 'B', purchaseDate: '2026-01-01' }),
      makeItem({ id: '3', name: 'C', purchaseDate: '2026-05-01' }),
    ];
    const lastUsedDates = { '1': '2026-05-10', '3': '2026-05-01' };
    const sorted = sortByMetric(items4, 'days_unused', {}, 'asc', lastUsedDates);
    expect(sorted.map(i => i.id)).toEqual(['1', '3', '2']);
  });
});
