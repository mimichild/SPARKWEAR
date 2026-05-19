import { filterByPeriod, sortByMetric, calcCP } from '../../hooks/useRanking';
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

// ─── sortByMetric ─────────────────────────────────────────────────────────────

describe('sortByMetric', () => {
  const items: Item[] = [
    makeItem({ id: 'a', name: 'A', usageCount: 2, originalPrice: 500 }),
    makeItem({ id: 'b', name: 'B', usageCount: 5, originalPrice: 200 }),
    makeItem({ id: 'c', name: 'C', usageCount: 1, originalPrice: 800 }),
  ];

  const voteCounts: Record<string, number> = { a: 3, b: 0, c: 0 };

  it('usage desc：usageCount + voteCount 高到低', () => {
    // a: 2+3=5, b: 5+0=5, c: 1+0=1 → b,a,c（同分時 usageCount 高者優先：b=5 > a=2）
    const r = sortByMetric(items, 'usage', voteCounts);
    expect(r.map(i => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('price_asc：originalPrice 低到高（無價格排最後）', () => {
    const noPrice = makeItem({ id: 'd', name: 'D', usageCount: 0 });
    const r = sortByMetric([...items, noPrice], 'price_asc', {});
    expect(r.map(i => i.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('price_desc：originalPrice 高到低', () => {
    const r = sortByMetric(items, 'price_desc', {});
    expect(r.map(i => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('cp：C/P 值低到高（Infinity 排最後）', () => {
    // a: 500/2=250, b: 200/5=40, c: 800/1=800 → b,a,c
    const r = sortByMetric(items, 'cp', {});
    expect(r.map(i => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('cp：usageCount=0 → Infinity → 排最後', () => {
    const zero = makeItem({ id: 'z', name: 'Z', usageCount: 0, originalPrice: 100 });
    const r = sortByMetric([...items, zero], 'cp', {});
    expect(r[r.length - 1].id).toBe('z');
  });
});
