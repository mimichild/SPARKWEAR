import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizeDateString } from '../utils/dateUtils';

// 一次性修復（db v9→v10）：購買日期／穿搭日期是手動輸入的文字，舊資料可能存成
// 未補零的 "2026-11-8"。資料庫以文字比較日期（排序、排行頁期間統計），未補零會
// 讓 "2026-11-8" 被當成比 "2026-11-19" 新、或落在錯誤的期間。這裡把三個日期欄位
// 一律補零成 YYYY-MM-DD；只改格式不改日期，無法辨識的文字原樣保留。
const TARGETS = [
  { table: 'items', column: 'purchase_date' },
  { table: 'outfits', column: 'date' },
  { table: 'item_usage_logs', column: 'logged_at' },
] as const;

export async function normalizeStoredDates(db: SQLiteDatabase): Promise<number> {
  let updated = 0;
  for (const { table, column } of TARGETS) {
    const rows = await db.getAllAsync<{ id: string; value: string }>(
      `SELECT id, ${column} as value FROM ${table}
       WHERE ${column} IS NOT NULL
         AND ${column} NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
    );
    for (const row of rows) {
      const normalized = normalizeDateString(row.value);
      if (normalized === row.value) continue;
      await db.runAsync(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [normalized, row.id]);
      updated++;
    }
  }
  return updated;
}
