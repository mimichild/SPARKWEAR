import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from '../db/context';
import { getItems, getAllVoteCounts } from '../services/itemService';
import { getColors } from '../services/categoryService';
import { getUsageCountsByPeriod, getAllUsageCounts, getLastUsedDates } from '../services/usageLogService';
import type { Item, RankEntry, RankingMetric, RankingPeriod, SortDir } from '../types';

// ─── Pure computation helpers (exported for testing) ─────────────────────────

export function calcCP(item: Item): number {
  const price = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
  if (price == null || item.usageCount === 0) return Infinity;
  return price / item.usageCount;
}

// 未使用天數：有使用紀錄就用最近一次 logged_at，從沒使用過就用購買日期
// （沒有購買日期則用建立日期）當基準，天數越多代表越久沒穿
export function calcDaysUnused(
  item: Item,
  lastUsedDate: string | undefined,
  now: Date = new Date()
): number {
  const baseline = lastUsedDate ?? item.purchaseDate ?? item.createdAt;
  const base = new Date(baseline);
  const diffMs = now.getTime() - base.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// hasEvidence=false 代表完全沒有 outfit/manual-log 任何一種使用紀錄，
// 顯示的天數是從購買日期／建立日期估算的，不是真的查得到的「最後使用日」，
// 用「尚未使用」跟有真實紀錄可查的單品明確區分開，避免使用者誤以為那天真的穿過
export function formatDaysUnusedText(days: number, hasEvidence: boolean): string {
  return hasEvidence ? `${days} 天` : `尚未使用（${days} 天）`;
}

export function filterByCategory(items: Item[], categoryIds: string[]): Item[] {
  if (categoryIds.length === 0) return items;
  return items.filter(item => item.categoryId != null && categoryIds.includes(item.categoryId));
}

export function filterByPeriod(items: Item[], period: RankingPeriod, ref: Date): Item[] {
  if (period === 'all') return items;

  const year = ref.getFullYear();
  const month = ref.getMonth();
  const quarter = Math.floor(month / 3);

  return items.filter((item) => {
    if (!item.purchaseDate) return false;
    const d = new Date(item.purchaseDate);
    switch (period) {
      case 'month':   return d.getFullYear() === year && d.getMonth() === month;
      case 'quarter': return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter;
      case 'year':    return d.getFullYear() === year;
      case 'rolling': {
        const ago = new Date(ref);
        ago.setFullYear(ago.getFullYear() - 1);
        return d >= ago && d <= ref;
      }
      default: return true;
    }
  });
}

export function sortByMetric(
  items: Item[],
  metric: RankingMetric,
  voteCounts: Record<string, number>,
  dir: SortDir = 'desc',
  lastUsedDates: Record<string, string> = {}
): Item[] {
  const sorted = [...items];
  const mul = dir === 'desc' ? 1 : -1;
  const now = new Date();

  switch (metric) {
    case 'days_unused':
      // desc（預設）＝天數多排前＝最久沒穿的在最上面
      return sorted.sort((a, b) => {
        const aDays = calcDaysUnused(a, lastUsedDates[a.id], now);
        const bDays = calcDaysUnused(b, lastUsedDates[b.id], now);
        return mul * (bDays - aDays);
      });

    case 'usage':
      return sorted.sort((a, b) => {
        const aScore = a.usageCount + (voteCounts[a.id] ?? 0);
        const bScore = b.usageCount + (voteCounts[b.id] ?? 0);
        if (aScore !== bScore) return mul * (bScore - aScore);
        return mul * (b.usageCount - a.usageCount);
      });

    case 'price':
      return sorted.sort((a, b) => {
        const aPrice = a.discountPrice ?? a.specialPrice ?? a.originalPrice;
        const bPrice = b.discountPrice ?? b.specialPrice ?? b.originalPrice;
        if (aPrice == null && bPrice == null) return 0;
        if (aPrice == null) return 1;
        if (bPrice == null) return -1;
        return mul * (bPrice - aPrice);
      });

    case 'cp':
      // C/P = price ÷ usageCount，數值越低 = 越划算 = 「C/P越高」
      // ↑ (desc) = 最划算排前 = 數值最低排前 → 翻轉 mul
      return sorted.sort((a, b) => {
        const aVal = calcCP(a);
        const bVal = calcCP(b);
        if (!isFinite(aVal) && !isFinite(bVal)) return 0;
        if (!isFinite(aVal)) return 1;
        if (!isFinite(bVal)) return -1;
        return (-mul) * (bVal - aVal);
      });

    // brand_count / color_count 由 buildBrandRanking / buildColorRanking 處理
    default:
      return sorted;
  }
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

function topItem(items: Item[], voteCounts: Record<string, number>): Item | undefined {
  return items.reduce<Item | undefined>((best, cur) => {
    if (!best) return cur;
    const bestScore = best.usageCount + (voteCounts[best.id] ?? 0);
    const curScore  = cur.usageCount  + (voteCounts[cur.id]  ?? 0);
    return curScore > bestScore ? cur : best;
  }, undefined);
}

export function buildBrandRanking(
  items: Item[],
  voteCounts: Record<string, number>,
  dir: SortDir
): RankEntry[] {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.brand?.trim() || '';
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const entries: RankEntry[] = Array.from(groups.entries()).map(([brand, groupItems]) => {
    const rep = topItem(groupItems, voteCounts);
    return {
      id: `brand-${brand}`,
      title: brand,
      subtitle: `共 ${groupItems.length} 件`,
      scoreText: `${groupItems.length} 件`,
      photoPath: rep?.photoIds[0],
      itemId: rep?.id,
    };
  });

  const mul = dir === 'desc' ? 1 : -1;
  return entries.sort((a, b) => {
    const ac = parseInt(a.scoreText);
    const bc = parseInt(b.scoreText);
    return mul * (bc - ac);
  });
}

export function buildColorRanking(
  items: Item[],
  voteCounts: Record<string, number>,
  colorMap: Record<string, string>,
  dir: SortDir
): RankEntry[] {
  // 以 colorId 分組，統計每個顏色的總使用次數
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    for (const cid of item.colorIds) {
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push(item);
    }
  }

  const mul = dir === 'desc' ? 1 : -1;

  return Array.from(groups.entries())
    .sort((a, b) => mul * (b[1].length - a[1].length))
    .map(([cid, groupItems]) => {
      const rep = topItem(groupItems, voteCounts);
      return {
        id: `color-${cid}`,
        title: colorMap[cid] ?? cid,
        scoreText: `${groupItems.length} 件`,
        photoPath: rep?.photoIds[0],
        itemId: rep?.id,
      } as RankEntry;
    });
}

function itemToEntry(
  item: Item,
  metric: RankingMetric,
  voteCounts: Record<string, number>,
  lastUsedDates: Record<string, string> = {}
): RankEntry {
  let scoreText = '';
  switch (metric) {
    case 'days_unused': {
      const hasEvidence = lastUsedDates[item.id] !== undefined;
      const days = calcDaysUnused(item, lastUsedDates[item.id]);
      scoreText = formatDaysUnusedText(days, hasEvidence);
      break;
    }
    case 'usage': {
      const total = Math.max(0, item.usageCount + (voteCounts[item.id] ?? 0));
      scoreText = `${total} 次`;
      break;
    }
    case 'price': {
      const p = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
      scoreText = p != null ? `$${p}` : '—';
      break;
    }
    case 'cp': {
      const price = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
      scoreText = (price == null || item.usageCount === 0)
        ? '—'
        : `$${Math.round(price / item.usageCount)}/次`;
      break;
    }
  }
  return {
    id: item.id,
    title: item.name,
    subtitle: item.brand,
    scoreText,
    photoPath: item.photoIds[0],
    itemId: item.id,
  };
}

// ─── Period date range ────────────────────────────────────────────────────────

function getPeriodDateRange(period: RankingPeriod, ref: Date): { start: string; end: string } | null {
  if (period === 'all') return null;
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const q = Math.floor(m / 3);
  const pad = (n: number) => String(n).padStart(2, '0');
  switch (period) {
    case 'month': {
      const lastDay = new Date(y, m + 1, 0).getDate();
      return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${lastDay}` };
    }
    case 'quarter': {
      const s = q * 3 + 1, e = s + 2;
      const lastDay = new Date(y, e, 0).getDate();
      return { start: `${y}-${pad(s)}-01`, end: `${y}-${pad(e)}-${lastDay}` };
    }
    case 'year':
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'rolling': {
      const ago = new Date(ref);
      ago.setFullYear(ago.getFullYear() - 1);
      return { start: ago.toISOString().slice(0, 10), end: ref.toISOString().slice(0, 10) };
    }
    default: return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRanking(
  metric: RankingMetric,
  period: RankingPeriod,
  dir: SortDir = 'desc',
  categoryIds: string[] = []
) {
  const db = useSQLiteContext();
  const [ranked, setRanked] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawItems, voteCounts, colors, lastUsedDates] = await Promise.all([
        getItems(db),
        getAllVoteCounts(db),
        getColors(db),
        getLastUsedDates(db),
      ]);
      const items = filterByCategory(rawItems, categoryIds);
      const colorMap: Record<string, string> = {};
      colors.forEach(c => { colorMap[c.id] = c.name; });

      let entries: RankEntry[];

      if (metric === 'usage' && period !== 'all') {
        // 依 item_usage_logs 統計指定時段內的穿搭次數
        const range = getPeriodDateRange(period, new Date())!;
        const periodCounts = await getUsageCountsByPeriod(db, range.start, range.end);
        const itemMap = new Map(items.map(i => [i.id, i]));
        const mul = dir === 'desc' ? 1 : -1;
        entries = items
          .map(item => ({ item, count: periodCounts[item.id] ?? 0 }))
          .sort((a, b) => mul * (b.count - a.count))
          .map(({ item, count }) => ({
            id: item.id,
            title: item.name,
            subtitle: item.brand,
            scoreText: `${count} 次`,
            photoPath: item.photoIds[0],
            itemId: item.id,
          }));
      } else if (metric === 'cp' && period !== 'all') {
        // 依 item_usage_logs 統計時段使用次數，計算期間 C/P 值
        const range = getPeriodDateRange(period, new Date())!;
        const periodCounts = await getUsageCountsByPeriod(db, range.start, range.end);
        // C/P 越低 = 越划算，'desc' 方向代表最划算排前 → 按 cp 升序
        const mul = dir === 'desc' ? 1 : -1;
        entries = items
          .map(item => {
            const price = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
            if (price == null) return null;
            const uses = periodCounts[item.id] ?? 0;
            const cp = uses > 0 ? price / uses : price;
            const scoreText = uses > 0
              ? `$${Math.round(cp)}/次`
              : `$${price}（未使用）`;
            return { item, cp, scoreText };
          })
          .filter((x): x is { item: Item; cp: number; scoreText: string } => x !== null)
          .sort((a, b) => mul * (a.cp - b.cp))
          .map(({ item, scoreText }) => ({
            id: item.id,
            title: item.name,
            subtitle: item.brand,
            scoreText,
            photoPath: item.photoIds[0],
            itemId: item.id,
          }));
      } else if (metric === 'usage' && period === 'all') {
        // 累積：從 item_usage_logs 計算全部次數，與時段版本統一資料來源
        const allCounts = await getAllUsageCounts(db);
        const itemMap = new Map(items.map(i => [i.id, i]));
        const mul = dir === 'desc' ? 1 : -1;
        entries = items
          .map(item => ({ item, count: allCounts[item.id] ?? 0 }))
          .sort((a, b) => mul * (b.count - a.count))
          .map(({ item, count }) => ({
            id: item.id,
            title: item.name,
            subtitle: item.brand,
            scoreText: `${count} 次`,
            photoPath: item.photoIds[0],
            itemId: item.id,
          }));
        void itemMap;
      } else if (metric === 'cp' && period === 'all') {
        // 累積 C/P：從 item_usage_logs 計算全部使用次數
        const allCounts = await getAllUsageCounts(db);
        const mul = dir === 'desc' ? 1 : -1;
        entries = items
          .map(item => {
            const price = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
            if (price == null) return null;
            const uses = allCounts[item.id] ?? 0;
            const cp = uses > 0 ? price / uses : price;
            const scoreText = uses > 0
              ? `$${Math.round(cp)}/次`
              : `$${price}（未使用）`;
            return { item, cp, scoreText };
          })
          .filter((x): x is { item: Item; cp: number; scoreText: string } => x !== null)
          .sort((a, b) => mul * (a.cp - b.cp))
          .map(({ item, scoreText }) => ({
            id: item.id,
            title: item.name,
            subtitle: item.brand,
            scoreText,
            photoPath: item.photoIds[0],
            itemId: item.id,
          }));
      } else if (metric === 'brand_count' || metric === 'color_count') {
        const filtered = filterByPeriod(items, period, new Date());
        entries = metric === 'brand_count'
          ? buildBrandRanking(filtered, voteCounts, dir)
          : buildColorRanking(filtered, voteCounts, colorMap, dir);
      } else {
        // 金額、未使用天數或其他指標
        const filtered = filterByPeriod(items, period, new Date());
        const sorted = sortByMetric(filtered, metric, voteCounts, dir, lastUsedDates);
        entries = sorted.map(item => itemToEntry(item, metric, voteCounts, lastUsedDates));
      }

      setRanked(entries);
    } finally {
      setLoading(false);
    }
  }, [db, metric, period, dir, categoryIds]);

  useEffect(() => { load(); }, [load]);

  return { ranked, loading, reload: load };
}
