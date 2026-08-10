import type { SQLiteDatabase } from 'expo-sqlite';

export async function logItemUsages(
  db: SQLiteDatabase,
  itemIds: string[],
  date: string,
  source: 'outfit' | 'manual' = 'outfit'
): Promise<void> {
  const now = new Date().toISOString();
  for (const itemId of itemIds) {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await db.runAsync(
      'INSERT INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, itemId, date, source, now]
    );
  }
}

export async function removeItemUsages(
  db: SQLiteDatabase,
  itemIds: string[],
  date: string,
  source: 'outfit' | 'manual' = 'outfit'
): Promise<void> {
  for (const itemId of itemIds) {
    await db.runAsync(
      `DELETE FROM item_usage_logs WHERE id IN (
         SELECT id FROM item_usage_logs
         WHERE item_id = ? AND logged_at = ? AND source = ?
         LIMIT 1
       )`,
      [itemId, date, source]
    );
  }
}

export async function getAllUsageCounts(
  db: SQLiteDatabase
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ item_id: string; count: number }>(
    `SELECT item_id, COUNT(*) as count FROM item_usage_logs GROUP BY item_id`
  );
  const result: Record<string, number> = {};
  rows.forEach(r => { result[r.item_id] = r.count; });
  return result;
}

export async function getUsageCountsByPeriod(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ item_id: string; count: number }>(
    `SELECT item_id, COUNT(*) as count FROM item_usage_logs
     WHERE logged_at >= ? AND logged_at <= ?
     GROUP BY item_id`,
    [startDate, endDate]
  );
  const result: Record<string, number> = {};
  rows.forEach(r => { result[r.item_id] = r.count; });
  return result;
}

// 排行榜的 usage/cp 指標完全依 item_usage_logs 計算（見 useRanking.ts），
// 手動修改 items.usage_count（單品表單）不會自動反映在排行上，
// 需要在這裡補/刪 log 讓兩邊筆數對齊
export async function reconcileUsageLogs(
  db: SQLiteDatabase,
  itemId: string,
  targetCount: number,
  referenceDate: string
): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM item_usage_logs WHERE item_id = ?',
    [itemId]
  );
  const current = row?.count ?? 0;
  const diff = targetCount - current;
  if (diff > 0) {
    const now = new Date().toISOString();
    for (let i = 0; i < diff; i++) {
      const id = `log-manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${i}`;
      await db.runAsync(
        'INSERT INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, itemId, referenceDate, 'manual', now]
      );
    }
  } else if (diff < 0) {
    // 優先刪除非穿搭來源的 log（manual/migration），保留與實際穿搭紀錄對應的 log
    await db.runAsync(
      `DELETE FROM item_usage_logs WHERE id IN (
         SELECT id FROM item_usage_logs
         WHERE item_id = ?
         ORDER BY
           CASE source WHEN 'manual' THEN 0 WHEN 'migration' THEN 1 ELSE 2 END,
           created_at DESC
         LIMIT ?
       )`,
      [itemId, -diff]
    );
  }
}
