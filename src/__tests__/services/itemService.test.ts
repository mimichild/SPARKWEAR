import {
  getItems, getItemById, saveItem, updateItem, deleteItem,
  filterItems, getVoteCount, addVote, getAllVoteCounts, incrementUsageCount, decrementUsageCount,
} from '../../services/itemService';
import type { Item } from '../../types';

const baseItem: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'テスト上衣',
  brand: 'TEST',
  purchaseDate: '2024-03-01',
  categoryId: 'cat-1',
  colorIds: ['col-1'],
  usageCount: 0,
  seasons: ['春季'],
  photoIds: [],
};

const fullItemRow = {
  id: 'item-1',
  brand: 'TEST',
  name: 'テスト上衣',
  purchase_date: '2024-03-01',
  purchase_time: null,
  category_id: 'cat-1',
  origin_id: null,
  color_ids: '["col-1"]',
  grade: 'A',
  original_price: 1200,
  special_price: null,
  discount_price: null,
  size: 'M',
  weight: null,
  body_type: null,
  suggested_weight: null,
  usage_count: 3,
  seasons: '["春季"]',
  mini_note: '好穿',
  pros: null,
  cons: null,
  remark: null,
  photo_ids: '["p1","p2"]',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

function makeDb(overrides: Record<string, jest.Mock> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    ...overrides,
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

// ── getItems ──────────────────────────────────────────────────

describe('itemService — getItems', () => {
  it('returns mapped items in desc order by default', async () => {
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([fullItemRow]) });
    const items = await getItems(db);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('item-1');
    expect(items[0].name).toBe('テスト上衣');
  });

  it('uses ASC order when specified', async () => {
    const db = makeDb();
    await getItems(db, 'asc');
    expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('ASC'));
  });

  it('deserialises JSON array fields', async () => {
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([fullItemRow]) });
    const [item] = await getItems(db);
    expect(item.colorIds).toEqual(['col-1']);
    expect(item.seasons).toEqual(['春季']);
    expect(item.photoIds).toEqual(['p1', 'p2']);
  });

  it('deserialises grade correctly', async () => {
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([fullItemRow]) });
    const [item] = await getItems(db);
    expect(item.grade).toBe('A');
  });

  it('maps null fields to undefined', async () => {
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([fullItemRow]) });
    const [item] = await getItems(db);
    expect(item.originId).toBeUndefined();
    expect(item.purchaseTime).toBeUndefined();
  });
});

// ── getItemById ───────────────────────────────────────────────

describe('itemService — getItemById', () => {
  it('returns null when not found', async () => {
    const db = makeDb();
    expect(await getItemById(db, 'nonexistent')).toBeNull();
  });

  it('returns mapped item when found', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(fullItemRow) });
    const item = await getItemById(db, 'item-1');
    expect(item?.id).toBe('item-1');
    expect(item?.usageCount).toBe(3);
  });
});

// ── saveItem ──────────────────────────────────────────────────

describe('itemService — saveItem', () => {
  it('inserts item and returns with id and timestamps', async () => {
    const db = makeDb();
    const item = await saveItem(db, baseItem);
    expect(item.id).toBeTruthy();
    expect(item.name).toBe('テスト上衣');
    expect(item.createdAt).toBeTruthy();
    expect(item.updatedAt).toBeTruthy();
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO items'),
      expect.any(Array)
    );
  });

  it('serialises JSON array fields in INSERT', async () => {
    const db = makeDb();
    await saveItem(db, { ...baseItem, colorIds: ['c1', 'c2'], seasons: ['春季', '夏季'] });
    const args = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
    const colorIdsIdx = 7; // 0-indexed position in values array
    const colorIdsValue = args[colorIdsIdx];
    expect(JSON.parse(colorIdsValue as string)).toEqual(['c1', 'c2']);
  });

  it('uses usageCount 0 as default', async () => {
    const db = makeDb();
    const item = await saveItem(db, { ...baseItem, usageCount: 0 });
    expect(item.usageCount).toBe(0);
  });

  it('does not touch item_usage_logs when usageCount is 0', async () => {
    const db = makeDb();
    await saveItem(db, { ...baseItem, usageCount: 0 });
    expect(db.runAsync).toHaveBeenCalledTimes(1); // only the INSERT INTO items
  });

  it('seeds item_usage_logs so the ranking page reflects a manually entered starting usageCount', async () => {
    const db = makeDb();
    await saveItem(db, { ...baseItem, usageCount: 3 });
    const logInserts = (db.runAsync as jest.Mock).mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO item_usage_logs')
    );
    expect(logInserts).toHaveLength(3);
    logInserts.forEach(([, args]) => {
      expect(args).toEqual(expect.arrayContaining(['2024-03-01', 'manual']));
    });
  });
});

// ── updateItem ────────────────────────────────────────────────

describe('itemService — updateItem', () => {
  it('throws when item not found', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(null) });
    await expect(updateItem(db, 'ghost', { name: 'x' })).rejects.toThrow('Item not found');
  });

  it('calls UPDATE with merged data', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(fullItemRow) });
    await updateItem(db, 'item-1', { name: '新名稱', grade: 'B' });
    const sql = (db.runAsync as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain('UPDATE items SET');
    const args = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
    // name is the second value (index 1 in update args)
    expect(args).toContain('新名稱');
  });

  it('does not touch item_usage_logs when usageCount is left unchanged', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(fullItemRow) });
    await updateItem(db, 'item-1', { name: '新名稱' });
    expect(db.runAsync).toHaveBeenCalledTimes(1); // only the UPDATE items
  });

  it('inserts item_usage_logs to match a manually increased usageCount, so ranking reflects the edit', async () => {
    const getFirstAsync = jest.fn()
      .mockResolvedValueOnce(fullItemRow)      // getItemById inside updateItem
      .mockResolvedValueOnce({ count: 2 });    // current log count inside reconcileUsageLogs
    const db = makeDb({ getFirstAsync });
    await updateItem(db, 'item-1', { usageCount: 6 }); // fullItemRow.usage_count is 3

    const logInserts = (db.runAsync as jest.Mock).mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO item_usage_logs')
    );
    expect(logInserts).toHaveLength(4); // 6 target - 2 existing logs
  });

  it('deletes item_usage_logs to match a manually decreased usageCount', async () => {
    const getFirstAsync = jest.fn()
      .mockResolvedValueOnce(fullItemRow)      // getItemById inside updateItem
      .mockResolvedValueOnce({ count: 5 });    // current log count inside reconcileUsageLogs
    const db = makeDb({ getFirstAsync });
    await updateItem(db, 'item-1', { usageCount: 1 }); // fullItemRow.usage_count is 3

    const logDelete = (db.runAsync as jest.Mock).mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('DELETE FROM item_usage_logs')
    );
    expect(logDelete).toBeTruthy();
    expect(logDelete?.[1]).toEqual(['item-1', 4]); // 5 existing logs - 1 target
  });
});

// ── deleteItem ────────────────────────────────────────────────

describe('itemService — deleteItem', () => {
  it('deletes vote_counts then item', async () => {
    const db = makeDb();
    await deleteItem(db, 'item-1');
    const calls = (db.runAsync as jest.Mock).mock.calls;
    expect(calls[0]).toEqual(['DELETE FROM vote_counts WHERE item_id = ?', ['item-1']]);
    expect(calls[1]).toEqual(['DELETE FROM items WHERE id = ?', ['item-1']]);
  });
});

// ── filterItems ───────────────────────────────────────────────

describe('itemService — filterItems', () => {
  const items: Item[] = [
    { ...baseItem, id: '1', name: '黑色上衣', brand: 'UNIQLO', createdAt: '', updatedAt: '' },
    { ...baseItem, id: '2', name: '白色裙子', brand: 'ZARA',   createdAt: '', updatedAt: '' },
    { ...baseItem, id: '3', name: '藍色外套', brand: 'H&M', miniNote: '好穿的外套', createdAt: '', updatedAt: '' },
  ];

  it('returns all items for empty query', () => {
    expect(filterItems(items, '')).toHaveLength(3);
  });

  it('filters by name', () => {
    const result = filterItems(items, '黑色');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by brand', () => {
    const result = filterItems(items, 'zara');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by miniNote', () => {
    const result = filterItems(items, '好穿');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('is case-insensitive', () => {
    expect(filterItems(items, 'UNIQLO')).toHaveLength(1);
    expect(filterItems(items, 'uniqlo')).toHaveLength(1);
  });

  it('returns empty array when no match', () => {
    expect(filterItems(items, 'xyznotfound')).toHaveLength(0);
  });
});

// ── Vote counts ───────────────────────────────────────────────

describe('itemService — votes', () => {
  describe('getVoteCount', () => {
    it('returns 0 when no votes', async () => {
      const db = makeDb();
      expect(await getVoteCount(db, 'item-1')).toBe(0);
    });

    it('returns count from DB', async () => {
      const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }) });
      expect(await getVoteCount(db, 'item-1')).toBe(5);
    });
  });

  describe('addVote', () => {
    it('calls upsert SQL', async () => {
      const db = makeDb();
      await addVote(db, 'item-1');
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vote_counts'),
        ['item-1']
      );
    });
  });

  describe('getAllVoteCounts', () => {
    it('returns map of item_id to count', async () => {
      const db = makeDb({
        getAllAsync: jest.fn().mockResolvedValue([
          { item_id: 'a', count: 3 },
          { item_id: 'b', count: 7 },
        ]),
      });
      const result = await getAllVoteCounts(db);
      expect(result).toEqual({ a: 3, b: 7 });
    });
  });

  describe('incrementUsageCount', () => {
    it('calls UPDATE with +1', async () => {
      const db = makeDb();
      await incrementUsageCount(db, 'item-1');
      expect(db.runAsync).toHaveBeenCalledWith(
        'UPDATE items SET usage_count = usage_count + 1 WHERE id = ?',
        ['item-1']
      );
    });
  });

  describe('decrementUsageCount', () => {
    it('calls UPDATE with -1, floored at 0', async () => {
      const db = makeDb();
      await decrementUsageCount(db, 'item-1');
      expect(db.runAsync).toHaveBeenCalledWith(
        'UPDATE items SET usage_count = MAX(usage_count - 1, 0) WHERE id = ?',
        ['item-1']
      );
    });
  });
});
