import { reconcileUsageLogs, getAllUsageLogs, getLastUsedDates } from '../../services/usageLogService';

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
