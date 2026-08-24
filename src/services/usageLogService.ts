import type { SQLiteDatabase } from 'expo-sqlite';
import type { UsageLog } from '../types';

export async function getAllUsageLogs(db: SQLiteDatabase): Promise<UsageLog[]> {
  const rows = await db.getAllAsync<{
    id: string; item_id: string; logged_at: string; source: string; created_at: string;
  }>('SELECT id, item_id, logged_at, source, created_at FROM item_usage_logs');
  return rows.map(r => ({
    id: r.id,
    itemId: r.item_id,
    loggedAt: r.logged_at,
    source: r.source as UsageLog['source'],
    createdAt: r.created_at,
  }));
}

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

export async function getLastUsedDates(
  db: SQLiteDatabase
): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ item_id: string; last_used: string }>(
    `SELECT item_id, MAX(logged_at) as last_used FROM item_usage_logs GROUP BY item_id`
  );
  const result: Record<string, string> = {};
  rows.forEach(r => { result[r.item_id] = r.last_used; });
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

// 一次性修復：舊版 reconcileUsageLogs／v3→v4 migration 補插 item_usage_logs 時
// 用「購買日期（沒有就用建立日期）」當日期，導致「未使用天數」（見 useRanking.ts
// calcDaysUnused）對只靠手動改使用次數追蹤穿搭的單品失真。只鎖定日期剛好等於那個
// filler 值、且單品後來又被編輯過（updated_at 更新）的紀錄，改用單品最後編輯時間
// 當更貼近真實的估計值；不會動到「新增穿搭」／「手動登錄穿搭紀錄」等有真實日期的紀錄，
// 因為那些紀錄的日期幾乎不會剛好等於購買日期／建立日期這個 filler 值。
export async function repairStaleReconciledLogDates(db: SQLiteDatabase): Promise<number> {
  const rows = await db.getAllAsync<{ log_id: string; updated_at: string }>(
    `SELECT l.id as log_id, i.updated_at as updated_at
     FROM item_usage_logs l
     JOIN items i ON i.id = l.item_id
     WHERE l.source IN ('manual', 'migration')
       AND l.logged_at = COALESCE(i.purchase_date, substr(i.created_at, 1, 10))
       AND substr(i.updated_at, 1, 10) > l.logged_at`
  );
  for (const row of rows) {
    await db.runAsync(
      'UPDATE item_usage_logs SET logged_at = ? WHERE id = ?',
      [row.updated_at.slice(0, 10), row.log_id]
    );
  }
  return rows.length;
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
