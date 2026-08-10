import { reconcileUsageLogs } from '../../services/usageLogService';

function makeDb(overrides: Record<string, jest.Mock> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    ...overrides,
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

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
