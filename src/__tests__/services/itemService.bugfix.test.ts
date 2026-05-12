/**
 * Regression tests for item save/display bugs
 *
 * Bug: photo_ids stored bare UUIDs ("abc123"), not full paths.
 *   - Display: `file://abc123` is invalid — file not found
 *   - ItemCard showed "NO PHOTO" even after uploading
 *
 * Fix: photo_ids now stores full file paths ("file:///…/photos/abc123.jpg")
 */
import { saveItem, getItemById } from '../../services/itemService';

function makeDb(overrides: Record<string, jest.Mock> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    ...overrides,
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

describe('itemService — photo path storage regression', () => {
  it('serialises full file paths in photo_ids, not bare UUIDs', async () => {
    const db = makeDb();
    const photoPath = 'file:///data/user/0/com.sparkwear/files/photos/abc123.jpg';

    await saveItem(db, {
      name: '測試上衣',
      usageCount: 0,
      seasons: [],
      colorIds: [],
      photoIds: [photoPath],  // form now passes full paths
    });

    const insertArgs = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
    // photo_ids is the 23rd parameter in the INSERT (index 22)
    const storedPhotoIds = JSON.parse(insertArgs[22] as string) as string[];
    expect(storedPhotoIds[0]).toBe(photoPath);
    expect(storedPhotoIds[0]).toMatch(/^file:\/\//); // must be a valid file URI
  });

  it('round-trips photo paths through save and retrieve', async () => {
    const photoPath = 'file:///data/.../photos/xyz789.jpg';
    const savedRow = {
      id: 'item-test',
      brand: null, name: '測試', purchase_date: null, purchase_time: null,
      category_id: null, origin_id: null,
      color_ids: '[]', grade: null,
      original_price: null, special_price: null, discount_price: null,
      size: null, weight: null, body_type: null, suggested_weight: null,
      usage_count: 0, seasons: '[]',
      mini_note: null, pros: null, cons: null, remark: null,
      photo_ids: JSON.stringify([photoPath]),
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(savedRow) });
    const item = await getItemById(db, 'item-test');

    expect(item?.photoIds[0]).toBe(photoPath);
    expect(item?.photoIds[0]).toMatch(/^file:\/\//);
  });
});
