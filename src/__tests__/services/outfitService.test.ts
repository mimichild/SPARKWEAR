import {
  getOutfits, getOutfitById, saveOutfit, updateOutfit, deleteOutfit, filterOutfits,
} from '../../services/outfitService';
import type { Outfit } from '../../types';

const baseOutfit: Omit<Outfit, 'id' | 'createdAt' | 'updatedAt'> = {
  date: '2024-05-10',
  time: '09:30',
  weather: '晴天 24°C',
  temperature: '24°C',
  county: '台北市',
  place: '信義區',
  note: '舒適一天',
  photoIds: ['p1', 'p2'],
  itemIds: ['item-1', 'item-2'],
};

const fullRow = {
  id: 'outfit-1',
  date: '2024-05-10',
  time: '09:30',
  weather: '晴天 24°C',
  temperature: '24°C',
  county: '台北市',
  place: '信義區',
  note: '舒適一天',
  photo_ids: '["p1","p2"]',
  item_ids: '["item-1","item-2"]',
  created_at: '2024-05-10T00:00:00.000Z',
  updated_at: '2024-05-10T00:00:00.000Z',
};

function makeDb(overrides: Record<string, jest.Mock> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    ...overrides,
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

// ── getOutfits ────────────────────────────────────────────────

describe('outfitService — getOutfits', () => {
  it('maps rows to Outfit objects', async () => {
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([fullRow]) });
    const [outfit] = await getOutfits(db);
    expect(outfit.id).toBe('outfit-1');
    expect(outfit.date).toBe('2024-05-10');
    expect(outfit.photoIds).toEqual(['p1', 'p2']);
    expect(outfit.itemIds).toEqual(['item-1', 'item-2']);
  });

  it('returns empty array when no outfits', async () => {
    expect(await getOutfits(makeDb())).toEqual([]);
  });

  it('uses DESC order by default', async () => {
    const db = makeDb();
    await getOutfits(db);
    expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('DESC'));
  });

  it('uses ASC order when specified', async () => {
    const db = makeDb();
    await getOutfits(db, 'asc');
    expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('ASC'));
  });

  it('maps null fields to undefined', async () => {
    const nullRow = { ...fullRow, time: null, weather: null, county: null, place: null, note: null };
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([nullRow]) });
    const [outfit] = await getOutfits(db);
    expect(outfit.time).toBeUndefined();
    expect(outfit.weather).toBeUndefined();
    expect(outfit.county).toBeUndefined();
  });
});

// ── getOutfitById ─────────────────────────────────────────────

describe('outfitService — getOutfitById', () => {
  it('returns null when not found', async () => {
    expect(await getOutfitById(makeDb(), 'ghost')).toBeNull();
  });

  it('returns mapped outfit when found', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(fullRow) });
    const outfit = await getOutfitById(db, 'outfit-1');
    expect(outfit?.county).toBe('台北市');
  });
});

// ── saveOutfit ────────────────────────────────────────────────

describe('outfitService — saveOutfit', () => {
  it('inserts and returns outfit with id and timestamps', async () => {
    const db = makeDb();
    const outfit = await saveOutfit(db, baseOutfit);
    expect(outfit.id).toBeTruthy();
    expect(outfit.date).toBe('2024-05-10');
    expect(outfit.createdAt).toBeTruthy();
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO outfits'),
      expect.any(Array)
    );
  });

  it('serialises photoIds and itemIds as JSON', async () => {
    const db = makeDb();
    await saveOutfit(db, baseOutfit);
    const args = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
    // photo_ids is at index 8, item_ids at index 9
    expect(JSON.parse(args[8] as string)).toEqual(['p1', 'p2']);
    expect(JSON.parse(args[9] as string)).toEqual(['item-1', 'item-2']);
  });

  it('stores null for optional fields when undefined', async () => {
    const db = makeDb();
    await saveOutfit(db, { date: '2024-01-01', photoIds: [], itemIds: [] });
    const args = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
    expect(args[2]).toBeNull(); // time
    expect(args[3]).toBeNull(); // weather
  });
});

// ── updateOutfit ──────────────────────────────────────────────

describe('outfitService — updateOutfit', () => {
  it('throws when outfit not found', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(null) });
    await expect(updateOutfit(db, 'ghost', { note: 'x' })).rejects.toThrow('Outfit not found');
  });

  it('calls UPDATE with merged data', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(fullRow) });
    await updateOutfit(db, 'outfit-1', { note: '新想法', place: '大安區' });
    const sql = (db.runAsync as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain('UPDATE outfits SET');
    const args = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
    expect(args).toContain('新想法');
    expect(args).toContain('大安區');
  });
});

// ── deleteOutfit ──────────────────────────────────────────────

describe('outfitService — deleteOutfit', () => {
  it('calls DELETE with correct id', async () => {
    const db = makeDb();
    await deleteOutfit(db, 'outfit-1');
    expect(db.runAsync).toHaveBeenCalledWith(
      'DELETE FROM outfits WHERE id = ?',
      ['outfit-1']
    );
  });

  it('decrements usage_count for every linked item when outfit existed', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(fullRow) });
    await deleteOutfit(db, 'outfit-1');

    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE items SET usage_count = MAX(usage_count - 1, 0) WHERE id = ?',
      ['item-1']
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE items SET usage_count = MAX(usage_count - 1, 0) WHERE id = ?',
      ['item-2']
    );
  });

  it('removes one matching item_usage_logs row per linked item', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(fullRow) });
    await deleteOutfit(db, 'outfit-1');

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM item_usage_logs'),
      ['item-1', '2024-05-10', 'outfit']
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM item_usage_logs'),
      ['item-2', '2024-05-10', 'outfit']
    );
  });

  it('skips usage adjustments when outfit no longer exists', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(null) });
    await deleteOutfit(db, 'ghost');

    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      'DELETE FROM outfits WHERE id = ?',
      ['ghost']
    );
  });
});

// ── filterOutfits ─────────────────────────────────────────────

describe('outfitService — filterOutfits', () => {
  const outfits: Outfit[] = [
    { ...baseOutfit, id: '1', county: '台北市', place: '信義區', createdAt: '', updatedAt: '' },
    { ...baseOutfit, id: '2', county: '台中市', weather: '多雲', note: '涼爽的一天', createdAt: '', updatedAt: '' },
    { ...baseOutfit, id: '3', date: '2024-03-15', county: '台南市', temperature: '28°C', createdAt: '', updatedAt: '' },
  ];

  it('returns all outfits for empty query', () => {
    expect(filterOutfits(outfits, '')).toHaveLength(3);
  });

  it('filters by county', () => {
    expect(filterOutfits(outfits, '台北')).toHaveLength(1);
  });

  it('filters by weather', () => {
    expect(filterOutfits(outfits, '多雲')).toHaveLength(1);
  });

  it('filters by note', () => {
    expect(filterOutfits(outfits, '涼爽')).toHaveLength(1);
  });

  it('filters by date', () => {
    expect(filterOutfits(outfits, '2024-03-15')).toHaveLength(1);
  });

  it('filters by temperature', () => {
    expect(filterOutfits(outfits, '28°C')).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    expect(filterOutfits(outfits, '台中')).toHaveLength(1);
  });

  it('returns empty when no match', () => {
    expect(filterOutfits(outfits, 'xyznotfound')).toHaveLength(0);
  });
});
