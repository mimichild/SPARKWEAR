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
  source: 'outfit' | 'manual-log' = 'outfit'
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
  source: 'outfit' | 'manual-log' = 'outfit'
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

// 用於排行頁「未使用天數」指標，信任三種來源：
// 'outfit'（新增穿搭，有真實日期）、'manual-log'（手動登錄穿搭紀錄，使用者自己選
// 的真實日期）、'count-sync'（手動改使用次數，日期是編輯當下——沒有精確到哪天真的
// 穿過，但使用者明確表示「這是最近的操作」，經確認後視為「當下使用」）。刻意排除
// 'manual'（舊版遺留、語意混用，無法分辨是真實日期還是舊邏輯的購買日期 filler）與
// 'migration'（v3→v4 一次性補填，用購買日期湊數，從來不是真實日期）：這兩種沒有
// 任何日期依據，讓沒有真實日期依據的單品 fallback 回 calcDaysUnused 的購買日期／
// 建立日期（見 useRanking.ts），且畫面上會用「尚未使用」跟有真實依據的日期明確
// 區分開，不會讓兩者看起來一樣。
export async function getLastUsedDates(
  db: SQLiteDatabase
): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ item_id: string; last_used: string }>(
    `SELECT item_id, MAX(logged_at) as last_used FROM item_usage_logs
     WHERE source IN ('outfit', 'manual-log', 'count-sync')
     GROUP BY item_id`
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

// 【歷史紀錄，已不再影響「未使用天數」——見下方說明，不要再依賴它】
// 一次性修復（db v4→v5）：舊版 reconcileUsageLogs／v3→v4 migration 補插
// item_usage_logs 時用「購買日期（沒有就用建立日期）」當日期，導致「未使用天數」
// （見 useRanking.ts calcDaysUnused）對只靠手動改使用次數追蹤穿搭的單品失真。只鎖定
// 日期剛好等於那個 filler 值、且單品後來又被編輯過（updated_at 更新）的紀錄，改用
// 單品最後編輯時間當更貼近真實的估計值。
// 【已知問題，下面 v5→v6 的 revertOverAggressiveLogDateRepair 試圖修正，但也不可靠】：
// 這個假設太寬鬆——updated_at 只要編輯單品任何欄位（不只是使用次數）就會更新，導致
// 完全沒有最近使用、也沒有手動改次數的單品被誤判成「最近使用」；v5→v6 的補救訊號
// （logged_at 是否晚於自身 created_at）在裝置一次跑完多個 migration（例如全新安裝、
// created_at 跟 logged_at 出自同一個時間點）時會失效，兩個修復疊加後讓資料變得更混亂
// （忽早忽晚、彼此矛盾）。函式本身保留不動（已對外發布過的歷史 migration，不能回頭
// 改寫它的行為），但 getLastUsedDates() 現在已經改成直接排除 'manual'／'migration'
// 這兩種來源，不會再讀到這兩個函式動過的資料，所以它們的錯誤已經不會再影響「未使用
// 天數」——不需要再用第四個 migration 去追著修，繼續猜只會製造更多矛盾。
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

// 【歷史紀錄，已不再影響「未使用天數」——理由同上，不要再依賴它】
// 曾經試圖修正 repairStaleReconciledLogDates（db v4→v5）的錯誤假設，用「logged_at
// 是否晚於同一筆紀錄自己的 created_at」這個矛盾訊號找出被誤改的紀錄改回保守值；
// 但這個訊號在裝置一次跑完多個 migration 時會失效（created_at 跟被改過的 logged_at
// 出自同一個時間點，訊號消失），並未能完全解決問題。函式本身保留不動（已對外發布過
// 的歷史 migration），但已不影響「未使用天數」——getLastUsedDates() 現在直接排除
// 'manual'／'migration' 來源，這兩個函式動過的資料不會再被讀到。
export async function revertOverAggressiveLogDateRepair(db: SQLiteDatabase): Promise<number> {
  const rows = await db.getAllAsync<{
    log_id: string; purchase_date: string | null; created_at_date: string;
  }>(
    `SELECT l.id as log_id, i.purchase_date as purchase_date,
            substr(i.created_at, 1, 10) as created_at_date
     FROM item_usage_logs l
     JOIN items i ON i.id = l.item_id
     WHERE l.source IN ('manual', 'migration')
       AND l.logged_at = substr(i.updated_at, 1, 10)
       AND l.logged_at > substr(l.created_at, 1, 10)`
  );
  for (const row of rows) {
    const fallback = row.purchase_date ?? row.created_at_date;
    await db.runAsync(
      'UPDATE item_usage_logs SET logged_at = ? WHERE id = ?',
      [fallback, row.log_id]
    );
  }
  return rows.length;
}

// 一次性修復（db v6→v7）：舊版 reconcileUsageLogs 的刪除邏輯沒有限制只刪
// count-sync/migration/manual 來源，導致「手動改使用次數改成比目前紀錄數低」時，
// 一旦沒有足夠的無日期依據紀錄可刪，會刪到真正對應「新增穿搭」的 outfit 來源紀錄，
// 讓那件單品之後看起來像沒穿過（未使用天數 fallback 回購買日期）。這個函式用
// outfits 表（每筆真實穿搭紀錄都有 item_ids 與 date，是唯一可信的真相來源）重新
// 補回缺漏的 outfit 來源紀錄：對每筆 outfit 的每個關聯單品，只在「這件單品在那個
// 日期還沒有 outfit 來源的紀錄」時才補插一筆，已存在（不管是原本就有、還是先前
// v2→v3 seed migration 建立的）一律跳過，不會造成重複計數。
export async function reseedMissingOutfitLogs(db: SQLiteDatabase): Promise<number> {
  const outfits = await db.getAllAsync<{ id: string; date: string; item_ids: string }>(
    'SELECT id, date, item_ids FROM outfits'
  );
  const now = new Date().toISOString();
  let inserted = 0;
  for (const outfit of outfits) {
    const itemIds: string[] = JSON.parse(outfit.item_ids || '[]');
    for (const itemId of itemIds) {
      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM item_usage_logs WHERE item_id = ? AND logged_at = ? AND source = 'outfit'`,
        [itemId, outfit.date]
      );
      if (existing) continue;
      const id = `log-reseed-${outfit.id}-${itemId}`;
      await db.runAsync(
        'INSERT INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, itemId, outfit.date, 'outfit', now]
      );
      inserted++;
    }
  }
  return inserted;
}

// 一次性修復（db v7→v8）：reseedMissingOutfitLogs（v6→v7）補回過去被誤刪的 outfit
// 紀錄時，只補 item_usage_logs 表，沒有同步調高 items.usage_count——這讓兩者出現
// 落差（log 表的真實筆數 > usage_count 欄位）。reconcileUsageLogs() 是靠比較
// 「usage_count 目標值」跟「item_usage_logs 目前筆數」的差來決定要補插還是刪除；
// 一旦真實筆數已經因為 reseed 而超過 usage_count，使用者手動把 usage_count 往上調
// （例如今天又穿了一次，+1）算出來的差可能還是負的，完全不會新增今天的 count-sync
// 紀錄，看起來就像「明明手動加了次數，卻還是顯示尚未使用」。這個函式把 usage_count
// 補回去對齊真實筆數（只在真實筆數較高時才調整，不會把使用者刻意調低的數字往下拉），
// 讓 reconcileUsageLogs 的差值計算恢復正確、也讓「使用次數」排行（本來就是依
// item_usage_logs 真實筆數計算，見 useRanking.ts）跟單品表單上顯示的數字一致。
export async function syncUsageCountToLogCount(db: SQLiteDatabase): Promise<number> {
  const rows = await db.getAllAsync<{ id: string; log_count: number }>(
    `SELECT i.id, COUNT(l.id) as log_count
     FROM items i
     LEFT JOIN item_usage_logs l ON l.item_id = i.id
     WHERE i.deleted_at IS NULL
     GROUP BY i.id
     HAVING COUNT(l.id) > i.usage_count`
  );
  for (const row of rows) {
    await db.runAsync('UPDATE items SET usage_count = ? WHERE id = ?', [row.log_count, row.id]);
  }
  return rows.length;
}

// 排行榜的 usage/cp 指標完全依 item_usage_logs 計算（見 useRanking.ts），
// 手動修改 items.usage_count（單品表單）不會自動反映在排行上，
// 需要在這裡補/刪 log 讓兩邊筆數對齊。
// 補插的紀錄一律標成 'count-sync'（而不是沿用舊版的 'manual'）：這個欄位本身沒有
// 日期輸入 UI，referenceDate 只是「編輯當下」的日期，不是真正的使用日期，跟
// 'manual-log'（手動登錄穿搭紀錄，使用者自己選的真實日期）要區分清楚，這樣
// getLastUsedDates() 才能明確排除它、不會被誤當成「最後使用時間」的真實依據。
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
        [id, itemId, referenceDate, 'count-sync', now]
      );
    }
  } else if (diff < 0) {
    // 只刪除沒有真實日期依據的 log（count-sync/migration/舊版留下的 manual）；
    // WHERE 子句本身就排除 outfit／manual-log，這兩種有真實日期的紀錄完全不會被
    // 這個函式刪到——即使可刪除的數量不夠補滿 -diff 也一樣，寧可讓 log 筆數跟
    // usage_count 對不齊，也不能為了湊數字而毀掉真實的穿搭歷史紀錄。
    // （這裡曾經只用 ORDER BY 排優先權、沒有限制 WHERE 的來源，導致「沒有足夠的
    // count-sync/migration 可刪」時會刪到真正對應穿搭紀錄的 outfit log，讓那件
    // 單品的「未使用天數」錯誤地 fallback 回購買日期，是這輪回報的 bug 根因）
    await db.runAsync(
      `DELETE FROM item_usage_logs WHERE id IN (
         SELECT id FROM item_usage_logs
         WHERE item_id = ? AND source IN ('count-sync', 'migration', 'manual')
         ORDER BY
           CASE source
             WHEN 'count-sync' THEN 0
             WHEN 'migration' THEN 1
             ELSE 2
           END,
           created_at DESC
         LIMIT ?
       )`,
      [itemId, -diff]
    );
  }
}
