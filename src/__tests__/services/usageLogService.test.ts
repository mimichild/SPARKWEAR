import { reconcileUsageLogs, getAllUsageLogs, getLastUsedDates, repairStaleReconciledLogDates } from '../../services/usageLogService';

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

// ── reconcileUsageLogs ───────────────────────────────────────────
// 手動編輯 items.usage_count 時，item_usage_logs 的筆數要跟著補齊/刪減，
// 這樣排行頁（完全依 item_usage_logs 計算 usage/cp 指標）才會反映手動修改的次數。

describe('usageLogService — reconcileUsageLogs', () => {
  it('does nothing when target count already matches log count', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }) });
    await reconcileUsageLogs(db, 'item-1', 5, '2024-03-01');
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('inserts manual-source logs to make up the gap when target is higher', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 2 }) });
    await reconcileUsageLogs(db, 'item-1', 5, '2024-03-01');

    const inserts = (db.runAsync as jest.Mock).mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO item_usage_logs')
    );
    expect(inserts).toHaveLength(3);
    inserts.forEach(([, args]) => {
      expect(args).toEqual(expect.arrayContaining(['item-1', '2024-03-01', 'manual']));
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

  it('deletes the excess logs, preferring manual/migration sources, when target is lower', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }) });
    await reconcileUsageLogs(db, 'item-1', 2, '2024-03-01');

    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const [sql, args] = (db.runAsync as jest.Mock).mock.calls[0];
    expect(sql).toContain('DELETE FROM item_usage_logs');
    expect(sql).toContain("CASE source WHEN 'manual' THEN 0 WHEN 'migration' THEN 1 ELSE 2 END");
    expect(args).toEqual(['item-1', 3]);
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
