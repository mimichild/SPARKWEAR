import { getItems, saveItem, updateItem } from '../../services/itemService';
import { normalizeDateString } from '../../utils/dateUtils';

// Bug：購買日期手動輸入「2026-11-8」（未補零）時，SQL 依文字排序會把它排在
// 「2026-11-19」之前（'8' > '1'），導致「新→舊」排序錯亂。

const row = (id: string, purchase_date: string | null, created_at = '2026-01-01T00:00:00.000Z') => ({
  id, brand: null, name: id, purchase_date, purchase_time: null,
  category_id: null, origin_id: null, color_ids: '[]', grade: null,
  original_price: null, special_price: null, discount_price: null,
  size: null, weight: null, body_type: null, suggested_weight: null,
  usage_count: 0, seasons: '[]', mini_note: null, pros: null, cons: null, remark: null,
  photo_ids: '[]', created_at, updated_at: created_at,
});

function makeDb(rows: unknown[] = [], existing: unknown = null) {
  return {
    getAllAsync: jest.fn().mockResolvedValue(rows),
    getFirstAsync: jest.fn().mockResolvedValue(existing),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

describe('normalizeDateString', () => {
  it.each([
    ['2026-11-8', '2026-11-08'],
    ['2026-1-5', '2026-01-05'],
    ['2026/3/7', '2026-03-07'],
    [' 2026-11-19 ', '2026-11-19'],
    ['2026-11-19', '2026-11-19'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeDateString(input)).toBe(expected);
  });

  it('leaves unrecognised text untouched (trimmed)', () => {
    expect(normalizeDateString('去年冬天')).toBe('去年冬天');
  });
});

describe('getItems — 未補零的舊資料也要依日期正確排序', () => {
  // SQL 文字排序（DESC）會回傳這個錯誤順序
  const sqlOrder = [row('kobe', '2026-11-19'), row('yabbi', '2026-11-8'), row('uniqlo', '2026-11-19', '2026-01-02T00:00:00.000Z'), row('nodate', null)];

  it('desc：新→舊', async () => {
    const items = await getItems(makeDb([row('yabbi', '2026-11-8'), row('uniqlo', '2026-11-19'), row('old', '2026-9-30')]), 'desc');
    expect(items.map(i => i.id)).toEqual(['uniqlo', 'yabbi', 'old']);
  });

  it('asc：舊→新', async () => {
    const items = await getItems(makeDb([row('uniqlo', '2026-11-19'), row('yabbi', '2026-11-8'), row('old', '2026-9-30')]), 'asc');
    expect(items.map(i => i.id)).toEqual(['old', 'yabbi', 'uniqlo']);
  });

  it('同日期時依建立時間排序，沒有日期的排在最後（desc）', async () => {
    const items = await getItems(makeDb(sqlOrder), 'desc');
    expect(items.map(i => i.id)).toEqual(['uniqlo', 'kobe', 'yabbi', 'nodate']);
  });
});

describe('save/update 時把購買日期正規化成 YYYY-MM-DD', () => {
  it('saveItem', async () => {
    const db = makeDb();
    await saveItem(db, { name: 'x', purchaseDate: '2026-11-8', colorIds: [], usageCount: 0, seasons: [], photoIds: [] });
    expect((db.runAsync as jest.Mock).mock.calls[0][1][3]).toBe('2026-11-08');
  });

  it('updateItem', async () => {
    const db = makeDb([], row('item-1', '2026-11-19'));
    await updateItem(db, 'item-1', { purchaseDate: '2026-11-8' });
    expect((db.runAsync as jest.Mock).mock.calls[0][1][2]).toBe('2026-11-08');
  });
});

describe('讀出時把舊資料的購買日期正規化（顯示與 new Date() 解析才正確）', () => {
  it('getItems 回傳補零後的 purchaseDate', async () => {
    const [item] = await getItems(makeDb([row('yabbi', '2026-11-8')]));
    expect(item.purchaseDate).toBe('2026-11-08');
  });
});
