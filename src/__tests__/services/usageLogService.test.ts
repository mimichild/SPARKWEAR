import {
  reconcileUsageLogs, getAllUsageLogs, getLastUsedDates,
  repairStaleReconciledLogDates, revertOverAggressiveLogDateRepair, reseedMissingOutfitLogs,
  syncUsageCountToLogCount,
} from '../../services/usageLogService';

function makeDb(overrides: Record<string, jest.Mock> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    ...overrides,
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

// ── getAllUsageLogs ───────────────────────────────────────────────
// 用於備份匯出：把 item_usage_logs 整張表讀出來一併寫進備份 manifest，
// 這樣還原備份後排行頁的期間統計（本月/本季最常穿）才不會是空的。

describe('usageLogService — getAllUsageLogs', () => {
  it('maps snake_case rows to camelCase UsageLog objects', async () => {
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'log-1', item_id: 'item-1', logged_at: '2024-05-10', source: 'outfit', created_at: '2024-05-10T00:00:00.000Z' },
      ]),
    });
    const logs = await getAllUsageLogs(db);
    expect(logs).toEqual([
      { id: 'log-1', itemId: 'item-1', loggedAt: '2024-05-10', source: 'outfit', createdAt: '2024-05-10T00:00:00.000Z' },
    ]);
  });

  it('returns an empty array when there are no logs', async () => {
    const db = makeDb();
    expect(await getAllUsageLogs(db)).toEqual([]);
  });
});

// ── getLastUsedDates ──────────────────────────────────────────────
// 用於排行頁「未使用天數」指標：取每件單品最近一次使用日期，沒有紀錄的單品不會出現在結果中。
// 信任 'outfit'（新增穿搭）／'manual-log'（手動登錄穿搭紀錄）／'count-sync'（手動
// 改使用次數，日期是編輯當下，經確認視為「當下使用」）；排除 'manual'（舊版遺留、
// 語意混用）／'migration'（購買日期湊數，從來不是真實日期）。

describe('usageLogService — getLastUsedDates', () => {
  it('maps item_id to its most recent logged_at date', async () => {
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { item_id: 'item-1', last_used: '2026-05-10' },
        { item_id: 'item-2', last_used: '2026-01-01' },
      ]),
    });
    expect(await getLastUsedDates(db)).toEqual({
      'item-1': '2026-05-10',
      'item-2': '2026-01-01',
    });
  });

  it('returns an empty object when there are no logs', async () => {
    const db = makeDb();
    expect(await getLastUsedDates(db)).toEqual({});
  });

  it('only queries outfit/manual-log/count-sync sources, excluding migration/legacy-manual filler rows', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = makeDb({ getAllAsync });
    await getLastUsedDates(db);
    const [sql] = getAllAsync.mock.calls[0];
    expect(sql).toContain("WHERE source IN ('outfit', 'manual-log', 'count-sync')");
  });
});

// ── repairStaleReconciledLogDates ─────────────────────────────────
// 一次性修復（db v4→v5 migration）：舊版 reconcileUsageLogs 補插的紀錄用購買日期
// 當日期，讓「未使用天數」失真；找出日期剛好等於 filler 值、且單品後來又被編輯過
// 的紀錄，改用單品最後編輯時間。

describe('usageLogService — repairStaleReconciledLogDates', () => {
  it('updates matched rows to the item’s updated_at date and returns the count', async () => {
    const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    const db = makeDb({
      runAsync,
      getAllAsync: jest.fn().mockResolvedValue([
        { log_id: 'log-1', updated_at: '2026-08-20T10:00:00.000Z' },
        { log_id: 'log-2', updated_at: '2026-08-22T09:30:00.000Z' },
      ]),
    });
    const count = await repairStaleReconciledLogDates(db);
    expect(count).toBe(2);
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE item_usage_logs SET logged_at = ? WHERE id = ?',
      ['2026-08-20', 'log-1']
    );
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE item_usage_logs SET logged_at = ? WHERE id = ?',
      ['2026-08-22', 'log-2']
    );
  });

  it('does nothing when there are no stale rows to fix', async () => {
    const runAsync = jest.fn();
    const db = makeDb({ runAsync, getAllAsync: jest.fn().mockResolvedValue([]) });
    const count = await repairStaleReconciledLogDates(db);
    expect(count).toBe(0);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('queries only manual/migration source rows whose date matches the purchase/created fallback and the item was edited since', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = makeDb({ getAllAsync });
    await repairStaleReconciledLogDates(db);
    const [sql] = getAllAsync.mock.calls[0];
    expect(sql).toContain("source IN ('manual', 'migration')");
    expect(sql).toContain('COALESCE(i.purchase_date, substr(i.created_at, 1, 10))');
  });
});

// ── revertOverAggressiveLogDateRepair ─────────────────────────────
// 修正 repairStaleReconciledLogDates（v4→v5）的錯誤假設：它把「單品最後編輯時間」
// 誤當成「最後使用時間」，導致完全沒有最近使用的單品被誤判成最近使用。
// 用「logged_at 晚於自己的 created_at」這個不可能發生在正常寫入紀錄上的矛盾訊號，
// 找出被那次修復誤改過的紀錄，改回購買日期／建立日期。

describe('usageLogService — revertOverAggressiveLogDateRepair', () => {
  it('reverts matched rows to purchase_date when available, and returns the count', async () => {
    const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    const db = makeDb({
      runAsync,
      getAllAsync: jest.fn().mockResolvedValue([
        { log_id: 'log-1', purchase_date: '2024-03-01', created_at_date: '2026-07-01' },
      ]),
    });
    const count = await revertOverAggressiveLogDateRepair(db);
    expect(count).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE item_usage_logs SET logged_at = ? WHERE id = ?',
      ['2024-03-01', 'log-1']
    );
  });

  it('falls back to created_at date when the item has no purchase_date', async () => {
    const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    const db = makeDb({
      runAsync,
      getAllAsync: jest.fn().mockResolvedValue([
        { log_id: 'log-1', purchase_date: null, created_at_date: '2026-07-01' },
      ]),
    });
    await revertOverAggressiveLogDateRepair(db);
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE item_usage_logs SET logged_at = ? WHERE id = ?',
      ['2026-07-01', 'log-1']
    );
  });

  it('does nothing when there are no mis-dated rows', async () => {
    const runAsync = jest.fn();
    const db = makeDb({ runAsync, getAllAsync: jest.fn().mockResolvedValue([]) });
    const count = await revertOverAggressiveLogDateRepair(db);
    expect(count).toBe(0);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('queries rows whose logged_at is after their own created_at (the impossible-for-real-data signal)', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = makeDb({ getAllAsync });
    await revertOverAggressiveLogDateRepair(db);
    const [sql] = getAllAsync.mock.calls[0];
    expect(sql).toContain("source IN ('manual', 'migration')");
    expect(sql).toContain('l.logged_at = substr(i.updated_at, 1, 10)');
    expect(sql).toContain('l.logged_at > substr(l.created_at, 1, 10)');
  });
});

// ── reseedMissingOutfitLogs ────────────────────────────────────────
// 一次性修復（db v6→v7 migration）：舊版 reconcileUsageLogs 的刪除邏輯可能誤刪
// 真正對應「新增穿搭」的 outfit 來源紀錄；用 outfits 表（真實穿搭紀錄，唯一可信
// 的真相來源）補回缺漏，已存在的（不管是原本就有還是先前 migration 建立的）跳過，
// 不會造成重複計數。

describe('usageLogService — reseedMissingOutfitLogs', () => {
  it('inserts a missing outfit log for each item in an outfit and returns the count', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      { id: 'outfit-1', date: '2026-07-26', item_ids: '["item-1","item-2"]' },
    ]);
    const getFirstAsync = jest.fn().mockResolvedValue(null); // 都不存在，都要補插
    const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    const db = makeDb({ getAllAsync, getFirstAsync, runAsync });

    const count = await reseedMissingOutfitLogs(db);

    expect(count).toBe(2);
    expect(runAsync).toHaveBeenCalledWith(
      'INSERT INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
      expect.arrayContaining(['log-reseed-outfit-1-item-1', 'item-1', '2026-07-26', 'outfit'])
    );
    expect(runAsync).toHaveBeenCalledWith(
      'INSERT INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
      expect.arrayContaining(['log-reseed-outfit-1-item-2', 'item-2', '2026-07-26', 'outfit'])
    );
  });

  it('skips items that already have an outfit log for that date (no duplicate counting)', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      { id: 'outfit-1', date: '2026-07-26', item_ids: '["item-1"]' },
    ]);
    const getFirstAsync = jest.fn().mockResolvedValue({ id: 'log-existing' }); // 已存在
    const runAsync = jest.fn();
    const db = makeDb({ getAllAsync, getFirstAsync, runAsync });

    const count = await reseedMissingOutfitLogs(db);

    expect(count).toBe(0);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('returns 0 when there are no outfits', async () => {
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([]) });
    expect(await reseedMissingOutfitLogs(db)).toBe(0);
  });
});

// ── syncUsageCountToLogCount ──────────────────────────────────────
// 一次性修復（db v7→v8 migration）：reseedMissingOutfitLogs（v6→v7）補回 log 但
// 沒有同步調高 items.usage_count，導致「手動增加使用次數」時 reconcileUsageLogs()
// 算出來的差值還是負的、完全不會新增今天的紀錄，看起來像「明明加了次數卻還是
// 顯示尚未使用」。這個函式把 usage_count 補回去對齊真實筆數。

describe('usageLogService — syncUsageCountToLogCount', () => {
  it('bumps usage_count up to the real log count and returns the affected count', async () => {
    const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    const db = makeDb({
      runAsync,
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'item-1', log_count: 8 },
      ]),
    });
    const count = await syncUsageCountToLogCount(db);
    expect(count).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE items SET usage_count = ? WHERE id = ?',
      [8, 'item-1']
    );
  });

  it('does nothing when usage_count already matches or exceeds the log count', async () => {
    const runAsync = jest.fn();
    const db = makeDb({ runAsync, getAllAsync: jest.fn().mockResolvedValue([]) });
    const count = await syncUsageCountToLogCount(db);
    expect(count).toBe(0);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('only selects items where the real log count exceeds usage_count', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = makeDb({ getAllAsync });
    await syncUsageCountToLogCount(db);
    const [sql] = getAllAsync.mock.calls[0];
    expect(sql).toContain('HAVING COUNT(l.id) > i.usage_count');
  });
});

// ── reconcileUsageLogs ───────────────────────────────────────────
// 手動編輯 items.usage_count 時，item_usage_logs 的筆數要跟著補齊/刪減，
// 這樣排行頁（完全依 item_usage_logs 計算 usage/cp 指標）才會反映手動修改的次數。

describe('usageLogService — reconcileUsageLogs', () => {
  it('does nothing when target count already matches log count', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }) });
    await reconcileUsageLogs(db, 'item-1', 5, '2024-03-01');
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('inserts count-sync-source logs to make up the gap when target is higher', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 2 }) });
    await reconcileUsageLogs(db, 'item-1', 5, '2024-03-01');

    const inserts = (db.runAsync as jest.Mock).mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO item_usage_logs')
    );
    expect(inserts).toHaveLength(3);
    inserts.forEach(([, args]) => {
      expect(args).toEqual(expect.arrayContaining(['item-1', '2024-03-01', 'count-sync']));
    });
  });

  it('inserts logs dated at the reference date when starting from zero', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 0 } ) });
    await reconcileUsageLogs(db, 'item-1', 2, '2024-06-15');

    const inserts = (db.runAsync as jest.Mock).mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO item_usage_logs')
    );
    expect(inserts).toHaveLength(2);
  });

  it('deletes the excess logs, preferring sources with no real date evidence, when target is lower', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }) });
    await reconcileUsageLogs(db, 'item-1', 2, '2024-03-01');

    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const [sql, args] = (db.runAsync as jest.Mock).mock.calls[0];
    expect(sql).toContain('DELETE FROM item_usage_logs');
    expect(sql).toContain("WHEN 'count-sync' THEN 0");
    expect(sql).toContain("WHEN 'migration' THEN 1");
    expect(args).toEqual(['item-1', 3]);
  });

  it('never deletes outfit/manual-log rows even when there are not enough deletable rows to hit the target', async () => {
    // 這是這輪回報 bug 的根因：舊版沒有限制刪除來源，導致沒有足夠 count-sync/migration
    // 可刪時會刪到真正的 outfit 紀錄，讓那件單品的「未使用天數」錯誤地 fallback 回購買日期
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }) });
    await reconcileUsageLogs(db, 'item-1', 2, '2024-03-01');

    const [sql] = (db.runAsync as jest.Mock).mock.calls[0];
    expect(sql).toContain("source IN ('count-sync', 'migration', 'manual')");
    expect(sql).not.toContain('outfit');
    expect(sql).not.toContain('manual-log');
  });

  it('treats missing log rows as zero', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(null) });
    await reconcileUsageLogs(db, 'item-1', 1, '2024-03-01');

    const inserts = (db.runAsync as jest.Mock).mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO item_usage_logs')
    );
    expect(inserts).toHaveLength(1);
  });
});
