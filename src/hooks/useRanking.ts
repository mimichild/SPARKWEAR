import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from '../db/context';
import { getItems, getAllVoteCounts } from '../services/itemService';
import { getColors } from '../services/categoryService';
import type { Item, RankEntry, RankingMetric, RankingPeriod, SortDir } from '../types';

// ─── Pure computation helpers (exported for testing) ─────────────────────────

export function calcCP(item: Item): number {
  const price = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
  if (price == null || item.usageCount === 0) return Infinity;
  return price / item.usageCount;
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
  dir: SortDir = 'desc'
): Item[] {
  const sorted = [...items];
  const mul = dir === 'desc' ? 1 : -1;

  switch (metric) {
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
  voteCounts: Record<string, number>
): RankEntry {
  let scoreText = '';
  switch (metric) {
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRanking(metric: RankingMetric, period: RankingPeriod, dir: SortDir = 'desc') {
  const db = useSQLiteContext();
  const [ranked, setRanked] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, voteCounts, colors] = await Promise.all([
        getItems(db),
        getAllVoteCounts(db),
        getColors(db),
      ]);
      const colorMap: Record<string, string> = {};
      colors.forEach(c => { colorMap[c.id] = c.name; });

      const filtered = filterByPeriod(items, period, new Date());

      let entries: RankEntry[];
      if (metric === 'brand_count') {
        entries = buildBrandRanking(filtered, voteCounts, dir);
      } else if (metric === 'color_count') {
        entries = buildColorRanking(filtered, voteCounts, colorMap, dir);
      } else {
        const sorted = sortByMetric(filtered, metric, voteCounts, dir);
        entries = sorted.map(item => itemToEntry(item, metric, voteCounts));
      }
      setRanked(entries);
    } finally {
      setLoading(false);
    }
  }, [db, metric, period, dir]);

  useEffect(() => { load(); }, [load]);

  return { ranked, loading, reload: load };
}
