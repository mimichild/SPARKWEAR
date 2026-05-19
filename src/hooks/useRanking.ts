import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from '../db/context';
import { getItems, getAllVoteCounts } from '../services/itemService';
import type { Item, RankingMetric, RankingPeriod } from '../types';

// ─── Pure computation helpers (exported for testing) ─────────────────────────

export function calcCP(item: Item): number {
  const price = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
  if (price == null || item.usageCount === 0) return Infinity;
  return price / item.usageCount;
}

export function filterByPeriod(items: Item[], period: RankingPeriod, ref: Date): Item[] {
  if (period === 'all') return items;

  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0-based
  const quarter = Math.floor(month / 3); // 0-based (0=Q1, 1=Q2, ...)

  return items.filter((item) => {
    if (!item.purchaseDate) return false;
    const d = new Date(item.purchaseDate);

    switch (period) {
      case 'month':
        return d.getFullYear() === year && d.getMonth() === month;
      case 'quarter':
        return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter;
      case 'year':
        return d.getFullYear() === year;
      case 'rolling': {
        const twelveMonthsAgo = new Date(ref);
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        return d >= twelveMonthsAgo && d <= ref;
      }
      default:
        return true;
    }
  });
}

export function sortByMetric(
  items: Item[],
  metric: RankingMetric,
  voteCounts: Record<string, number>
): Item[] {
  const sorted = [...items];

  switch (metric) {
    case 'usage':
      return sorted.sort((a, b) => {
        const aScore = a.usageCount + (voteCounts[a.id] ?? 0);
        const bScore = b.usageCount + (voteCounts[b.id] ?? 0);
        if (bScore !== aScore) return bScore - aScore;
        return b.usageCount - a.usageCount; // tiebreaker: 原始 usage 多者優先
      });

    case 'price_asc':
      return sorted.sort((a, b) => {
        const aPrice = a.discountPrice ?? a.specialPrice ?? a.originalPrice;
        const bPrice = b.discountPrice ?? b.specialPrice ?? b.originalPrice;
        if (aPrice == null && bPrice == null) return 0;
        if (aPrice == null) return 1;
        if (bPrice == null) return -1;
        return aPrice - bPrice;
      });

    case 'price_desc':
      return sorted.sort((a, b) => {
        const aPrice = a.discountPrice ?? a.specialPrice ?? a.originalPrice;
        const bPrice = b.discountPrice ?? b.specialPrice ?? b.originalPrice;
        if (aPrice == null && bPrice == null) return 0;
        if (aPrice == null) return 1;
        if (bPrice == null) return -1;
        return bPrice - aPrice;
      });

    case 'cp':
      return sorted.sort((a, b) => calcCP(a) - calcCP(b));

    default:
      return sorted;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRanking(metric: RankingMetric, period: RankingPeriod) {
  const db = useSQLiteContext();
  const [ranked, setRanked] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, voteCounts] = await Promise.all([
        getItems(db),
        getAllVoteCounts(db),
      ]);
      const filtered = filterByPeriod(items, period, new Date());
      const sorted = sortByMetric(filtered, metric, voteCounts);
      setRanked(sorted);
    } finally {
      setLoading(false);
    }
  }, [db, metric, period]);

  useEffect(() => { load(); }, [load]);

  return { ranked, loading, reload: load };
}
