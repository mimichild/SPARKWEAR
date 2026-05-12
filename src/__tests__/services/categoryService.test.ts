import {
  getCategories, addCategory, updateCategory, deleteCategory, reorderCategories,
  getOrigins, addOrigin, deleteOrigin,
  getColors, addColor, deleteColor,
} from '../../services/categoryService';

// Build a minimal mock db
function makeDb(overrides: Partial<ReturnType<typeof makeMockDb>> = {}) {
  return makeMockDb(overrides);
}

function makeMockDb(overrides: Record<string, jest.Mock> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    execAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

// ── Categories ────────────────────────────────────────────────

describe('categoryService — categories', () => {
  describe('getCategories', () => {
    it('maps rows to Category objects', async () => {
      const db = makeDb({
        getAllAsync: jest.fn().mockResolvedValue([
          { id: 'c1', name: '上衣', color: '#f48fb1', sort_order: 0, is_default: 1, created_at: '2024-01-01T00:00:00.000Z' },
        ]),
      });
      const result = await getCategories(db);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('上衣');
      expect(result[0].isDefault).toBe(true);
      expect(result[0].sortOrder).toBe(0);
    });

    it('returns empty array when no categories', async () => {
      const db = makeDb();
      expect(await getCategories(db)).toEqual([]);
    });
  });

  describe('addCategory', () => {
    it('inserts category and returns object', async () => {
      const db = makeDb({
        getAllAsync: jest.fn().mockResolvedValue([{ sort_order: 5 }]),
        runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
      });
      const cat = await addCategory(db, '新分類', '#ffffff');
      expect(cat.name).toBe('新分類');
      expect(cat.color).toBe('#ffffff');
      expect(cat.isDefault).toBe(false);
      expect(cat.sortOrder).toBe(6);
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        expect.arrayContaining(['新分類', '#ffffff', 6])
      );
    });

    it('trims whitespace from name', async () => {
      const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([]) });
      const cat = await addCategory(db, '  外套  ', '#000');
      expect(cat.name).toBe('外套');
    });
  });

  describe('updateCategory', () => {
    it('calls UPDATE with new name and color', async () => {
      const db = makeDb();
      await updateCategory(db, 'c1', '修改後', '#aabbcc');
      expect(db.runAsync).toHaveBeenCalledWith(
        'UPDATE categories SET name = ?, color = ? WHERE id = ?',
        ['修改後', '#aabbcc', 'c1']
      );
    });
  });

  describe('deleteCategory', () => {
    it('remaps items to 未分類 before deletion', async () => {
      const db = makeDb({
        getFirstAsync: jest.fn().mockResolvedValue({ id: 'cat-default-12' }),
        runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 0, changes: 0 }),
      });
      await deleteCategory(db, 'cat-1');
      const calls = (db.runAsync as jest.Mock).mock.calls;
      expect(calls[0]).toEqual([
        'UPDATE items SET category_id = ? WHERE category_id = ?',
        ['cat-default-12', 'cat-1'],
      ]);
      expect(calls[1]).toEqual(['DELETE FROM categories WHERE id = ?', ['cat-1']]);
    });

    it('sets category_id to NULL when 未分類 not found', async () => {
      const db = makeDb({
        getFirstAsync: jest.fn().mockResolvedValue(null),
      });
      await deleteCategory(db, 'cat-1');
      const calls = (db.runAsync as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('category_id = NULL');
    });
  });

  describe('reorderCategories', () => {
    it('updates sort_order for each id in sequence', async () => {
      const db = makeDb();
      await reorderCategories(db, ['c3', 'c1', 'c2']);
      const calls = (db.runAsync as jest.Mock).mock.calls;
      expect(calls[0]).toEqual(['UPDATE categories SET sort_order = ? WHERE id = ?', [0, 'c3']]);
      expect(calls[1]).toEqual(['UPDATE categories SET sort_order = ? WHERE id = ?', [1, 'c1']]);
      expect(calls[2]).toEqual(['UPDATE categories SET sort_order = ? WHERE id = ?', [2, 'c2']]);
    });
  });
});

// ── Origins ───────────────────────────────────────────────────

describe('categoryService — origins', () => {
  describe('getOrigins', () => {
    it('filters deleted origins', async () => {
      const db = makeDb({
        getAllAsync: jest.fn().mockResolvedValue([
          { id: 'o1', name: '日貨', is_default: 1, deleted: 0, created_at: '2024-01-01T00:00:00.000Z' },
        ]),
      });
      const result = await getOrigins(db);
      expect(result).toHaveLength(1);
      expect(result[0].deleted).toBe(false);
    });
  });

  describe('addOrigin', () => {
    it('inserts and returns Origin', async () => {
      const db = makeDb();
      const origin = await addOrigin(db, '官網');
      expect(origin.name).toBe('官網');
      expect(origin.isDefault).toBe(false);
      expect(db.runAsync).toHaveBeenCalled();
    });
  });

  describe('deleteOrigin', () => {
    it('clears origin_id from items then soft-deletes', async () => {
      const db = makeDb();
      await deleteOrigin(db, 'o1');
      const calls = (db.runAsync as jest.Mock).mock.calls;
      expect(calls[0]).toEqual(['UPDATE items SET origin_id = NULL WHERE origin_id = ?', ['o1']]);
      expect(calls[1]).toEqual(['UPDATE origins SET deleted = 1 WHERE id = ?', ['o1']]);
    });
  });
});

// ── Colors ────────────────────────────────────────────────────

describe('categoryService — colors', () => {
  describe('getColors', () => {
    it('maps rows to Color objects', async () => {
      const db = makeDb({
        getAllAsync: jest.fn().mockResolvedValue([
          { id: 'col1', name: '黑色', is_default: 1, created_at: '2024-01-01T00:00:00.000Z' },
        ]),
      });
      const result = await getColors(db);
      expect(result[0].name).toBe('黑色');
      expect(result[0].isDefault).toBe(true);
    });
  });

  describe('addColor', () => {
    it('inserts and returns Color', async () => {
      const db = makeDb();
      const color = await addColor(db, '湖水綠');
      expect(color.name).toBe('湖水綠');
      expect(color.isDefault).toBe(false);
    });
  });

  describe('deleteColor', () => {
    it('removes color id from all items before deletion', async () => {
      const db = makeDb({
        getAllAsync: jest.fn().mockResolvedValue([
          { id: 'item-1', color_ids: '["col1","col2"]' },
          { id: 'item-2', color_ids: '["col2"]' },
        ]),
      });
      await deleteColor(db, 'col1');
      const calls = (db.runAsync as jest.Mock).mock.calls;
      // item-1 should be updated (col1 removed), item-2 unchanged
      expect(calls[0][0]).toContain('UPDATE items SET color_ids');
      expect(JSON.parse(calls[0][1][0])).toEqual(['col2']);
      // DELETE colors
      const deleteCalls = calls.filter(c => c[0].includes('DELETE FROM colors'));
      expect(deleteCalls).toHaveLength(1);
    });

    it('deletes color even if no items reference it', async () => {
      const db = makeDb({
        getAllAsync: jest.fn().mockResolvedValue([]),
      });
      await deleteColor(db, 'col99');
      expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM colors WHERE id = ?', ['col99']);
    });
  });
});
