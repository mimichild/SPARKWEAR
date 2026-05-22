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
