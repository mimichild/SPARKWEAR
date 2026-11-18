import { normalizeStoredDates } from '../../services/dateNormalizationService';
import { logItemUsages, removeItemUsages } from '../../services/usageLogService';
import { saveOutfit, updateOutfit, getOutfits } from '../../services/outfitService';

// db v9→v10：手動輸入的日期可能存成未補零（如 "2026-11-8"），資料庫以文字比較
// 日期（排序、期間統計），需一次性補零成 YYYY-MM-DD，並在之後的寫入點都補零。

function makeDb(byTable: Record<string, unknown[]> = {}, existing: unknown = null) {
  return {
    getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
      for (const [table, rows] of Object.entries(byTable)) {
        if (sql.includes(`FROM ${table}`)) return rows;
      }
      return [];
    }),
    getFirstAsync: jest.fn().mockResolvedValue(existing),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

describe('normalizeStoredDates（db v9→v10 migration）', () => {
  it('只更新未補零的日期，三張表都處理，回傳更新筆數', async () => {
    const db = makeDb({
      items: [{ id: 'i1', value: '2026-11-8' }, { id: 'i2', value: '2026-11-19' }],
      outfits: [{ id: 'o1', value: '2026-3-5' }],
      item_usage_logs: [{ id: 'l1', value: '2026/11/8' }, { id: 'l2', value: '不是日期' }],
    });
    const n = await normalizeStoredDates(db);
    const run = db.runAsync as jest.Mock;
    expect(run).toHaveBeenCalledWith('UPDATE items SET purchase_date = ? WHERE id = ?', ['2026-11-08', 'i1']);
    expect(run).toHaveBeenCalledWith('UPDATE outfits SET date = ? WHERE id = ?', ['2026-03-05', 'o1']);
    expect(run).toHaveBeenCalledWith('UPDATE item_usage_logs SET logged_at = ? WHERE id = ?', ['2026-11-08', 'l1']);
    expect(run).toHaveBeenCalledTimes(3);
    expect(n).toBe(3);
  });

  it('只撈出格式不是 YYYY-MM-DD 的資料列', async () => {
    const db = makeDb();
    await normalizeStoredDates(db);
    const sqls = (db.getAllAsync as jest.Mock).mock.calls.map(c => c[0] as string);
    expect(sqls).toHaveLength(3);
    sqls.forEach(sql => expect(sql).toContain("NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"));
  });
});

describe('穿搭紀錄寫入／刪除時日期補零', () => {
  it('logItemUsages', async () => {
    const db = makeDb();
    await logItemUsages(db, ['i1'], '2026-11-8');
    expect((db.runAsync as jest.Mock).mock.calls[0][1][2]).toBe('2026-11-08');
  });

  it('removeItemUsages', async () => {
    const db = makeDb();
    await removeItemUsages(db, ['i1'], '2026-11-8');
    expect((db.runAsync as jest.Mock).mock.calls[0][1][1]).toBe('2026-11-08');
  });
});

describe('穿搭日期補零', () => {
  const outfitRow = {
    id: 'o1', date: '2026-11-8', time: null, weather: null, temperature: null,
    county: null, place: null, note: null, photo_ids: '[]', item_ids: '[]',
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('saveOutfit', async () => {
    const db = makeDb();
    const saved = await saveOutfit(db, { date: '2026-11-8', photoIds: [], itemIds: [] } as never);
    expect((db.runAsync as jest.Mock).mock.calls[0][1][1]).toBe('2026-11-08');
    expect(saved.date).toBe('2026-11-08');
  });

  it('updateOutfit', async () => {
    const db = makeDb({}, outfitRow);
    await updateOutfit(db, 'o1', { date: '2026-11-9' });
    const call = (db.runAsync as jest.Mock).mock.calls.find(c => (c[0] as string).includes('UPDATE outfits'));
    expect(call![1][0]).toBe('2026-11-09');
  });

  it('getOutfits 讀出時補零', async () => {
    const [o] = await getOutfits(makeDb({ outfits: [outfitRow] }));
    expect(o.date).toBe('2026-11-08');
  });
});
