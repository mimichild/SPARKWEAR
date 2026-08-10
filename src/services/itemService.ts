import type { SQLiteDatabase } from 'expo-sqlite';
import type { Item, Season, Grade, SortOrder } from '../types';
import { deletePhotos } from './photoService';
import type { Photo } from '../types';
import { reconcileUsageLogs } from './usageLogService';

// ── Serialization helpers ─────────────────────────────────────

function itemToRow(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  return {
    id: item.id,
    brand: item.brand ?? null,
    name: item.name,
    purchase_date: item.purchaseDate ?? null,
    purchase_time: item.purchaseTime ?? null,
    category_id: item.categoryId ?? null,
    origin_id: item.originId ?? null,
    color_ids: JSON.stringify(item.colorIds ?? []),
    grade: item.grade ?? null,
    original_price: item.originalPrice ?? null,
    special_price: item.specialPrice ?? null,
    discount_price: item.discountPrice ?? null,
    size: item.size ?? null,
    weight: item.weight ?? null,
    body_type: item.bodyType ?? null,
    suggested_weight: item.suggestedWeight ?? null,
    usage_count: item.usageCount ?? 0,
    seasons: JSON.stringify(item.seasons ?? []),
    mini_note: item.miniNote ?? null,
    pros: item.pros ?? null,
    cons: item.cons ?? null,
    remark: item.remark ?? null,
    photo_ids: JSON.stringify(item.photoIds ?? []),
  };
}

type ItemRow = {
  id: string; brand: string | null; name: string;
  purchase_date: string | null; purchase_time: string | null;
  category_id: string | null; origin_id: string | null;
  color_ids: string; grade: string | null;
  original_price: number | null; special_price: number | null; discount_price: number | null;
  size: string | null; weight: string | null; body_type: string | null; suggested_weight: string | null;
  usage_count: number; seasons: string; mini_note: string | null;
  pros: string | null; cons: string | null; remark: string | null;
  photo_ids: string; created_at: string; updated_at: string;
  deleted_at: string | null;
};

function rowToItem(row: ItemRow): Item {
  return {
    id: row.id,
    brand: row.brand ?? undefined,
    name: row.name,
    purchaseDate: row.purchase_date ?? undefined,
    purchaseTime: row.purchase_time ?? undefined,
    categoryId: row.category_id ?? undefined,
    originId: row.origin_id ?? undefined,
    colorIds: JSON.parse(row.color_ids || '[]'),
    grade: (row.grade as Grade) ?? undefined,
    originalPrice: row.original_price ?? undefined,
    specialPrice: row.special_price ?? undefined,
    discountPrice: row.discount_price ?? undefined,
    size: row.size ?? undefined,
    weight: row.weight ?? undefined,
    bodyType: row.body_type ?? undefined,
    suggestedWeight: row.suggested_weight ?? undefined,
    usageCount: row.usage_count,
    seasons: JSON.parse(row.seasons || '[]') as Season[],
    miniNote: row.mini_note ?? undefined,
    pros: row.pros ?? undefined,
    cons: row.cons ?? undefined,
    remark: row.remark ?? undefined,
    photoIds: JSON.parse(row.photo_ids || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

// ── CRUD ──────────────────────────────────────────────────────

export async function getItems(
  db: SQLiteDatabase,
  sort: SortOrder = 'desc'
): Promise<Item[]> {
  const order = sort === 'asc' ? 'ASC' : 'DESC';
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT * FROM items WHERE deleted_at IS NULL ORDER BY purchase_date ${order}, created_at ${order}`
  );
  return rows.map(rowToItem);
}

export async function getItemById(
  db: SQLiteDatabase,
  id: string
): Promise<Item | null> {
  const row = await db.getFirstAsync<ItemRow>('SELECT * FROM items WHERE id = ? AND deleted_at IS NULL', [id]);
  return row ? rowToItem(row) : null;
}

export async function saveItem(
  db: SQLiteDatabase,
  data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Item> {
  const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const row = itemToRow({ ...data, id });

  await db.runAsync(
    `INSERT INTO items (
      id, brand, name, purchase_date, purchase_time,
      category_id, origin_id, color_ids, grade,
      original_price, special_price, discount_price,
      size, weight, body_type, suggested_weight,
      usage_count, seasons, mini_note, pros, cons, remark,
      photo_ids, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )`,
    [
      id, row.brand, row.name, row.purchase_date, row.purchase_time,
      row.category_id, row.origin_id, row.color_ids, row.grade,
      row.original_price, row.special_price, row.discount_price,
      row.size, row.weight, row.body_type, row.suggested_weight,
      row.usage_count, row.seasons, row.mini_note, row.pros, row.cons, row.remark,
      row.photo_ids, now, now,
    ]
  );

  if (data.usageCount > 0) {
    await reconcileUsageLogs(db, id, data.usageCount, data.purchaseDate ?? now.slice(0, 10));
  }

  return { ...data, id, createdAt: now, updatedAt: now };
}

export async function updateItem(
  db: SQLiteDatabase,
  id: string,
  data: Partial<Omit<Item, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getItemById(db, id);
  if (!existing) throw new Error(`Item not found: ${id}`);

  const merged: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = { ...existing, ...data };
  const row = itemToRow(merged);

  await db.runAsync(
    `UPDATE items SET
      brand = ?, name = ?, purchase_date = ?, purchase_time = ?,
      category_id = ?, origin_id = ?, color_ids = ?, grade = ?,
      original_price = ?, special_price = ?, discount_price = ?,
      size = ?, weight = ?, body_type = ?, suggested_weight = ?,
      usage_count = ?, seasons = ?, mini_note = ?, pros = ?, cons = ?, remark = ?,
      photo_ids = ?, updated_at = ?
    WHERE id = ?`,
    [
      row.brand, row.name, row.purchase_date, row.purchase_time,
      row.category_id, row.origin_id, row.color_ids, row.grade,
      row.original_price, row.special_price, row.discount_price,
      row.size, row.weight, row.body_type, row.suggested_weight,
      row.usage_count, row.seasons, row.mini_note, row.pros, row.cons, row.remark,
      row.photo_ids, now,
      id,
    ]
  );

  if (data.usageCount !== undefined && data.usageCount !== existing.usageCount) {
    await reconcileUsageLogs(db, id, data.usageCount, merged.purchaseDate ?? now.slice(0, 10));
  }
}

export async function deleteItem(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM vote_counts WHERE item_id = ?', [id]);
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

// ── 暫存區（軟刪除）──────────────────────────────────────────

export async function moveToTrash(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE items SET deleted_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
}

export async function restoreFromTrash(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE items SET deleted_at = NULL WHERE id = ?', [id]);
}

export async function getTrashItems(db: SQLiteDatabase): Promise<Item[]> {
  const rows = await db.getAllAsync<ItemRow>(
    'SELECT * FROM items WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
  );
  return rows.map(rowToItem);
}

export async function cleanupExpiredTrash(db: SQLiteDatabase): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const expired = await db.getAllAsync<{ id: string; photo_ids: string }>(
    'SELECT id, photo_ids FROM items WHERE deleted_at IS NOT NULL AND deleted_at < ?',
    [cutoff]
  );
  for (const row of expired) {
    const photoIds: string[] = JSON.parse(row.photo_ids || '[]');
    if (photoIds.length > 0) {
      const photos = photoIds.map(p => ({ id: p, path: p, mimeType: 'image/jpeg', createdAt: '' } as Photo));
      await deletePhotos(photos);
    }
    await deleteItem(db, row.id);
  }
}

export async function updateItemCategory(
  db: SQLiteDatabase,
  id: string,
  categoryId: string | undefined
): Promise<void> {
  await db.runAsync(
    'UPDATE items SET category_id = ?, updated_at = ? WHERE id = ?',
    [categoryId ?? null, new Date().toISOString(), id]
  );
}

export async function incrementUsageCount(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE items SET usage_count = usage_count + 1 WHERE id = ?', [id]);
}

export async function decrementUsageCount(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE items SET usage_count = MAX(usage_count - 1, 0) WHERE id = ?', [id]);
}

// ── Search ────────────────────────────────────────────────────

export type ItemSearchMeta = {
  catNames?: Record<string, string>;
  originNames?: Record<string, string>;
  colorNames?: Record<string, string>;
};

export function filterItems(items: Item[], query: string, meta?: ItemSearchMeta): Item[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase().trim();
  return items.filter(item => {
    if ((item.name ?? '').toLowerCase().includes(q)) return true;
    if ((item.brand ?? '').toLowerCase().includes(q)) return true;
    if ((item.grade ?? '').toLowerCase().includes(q)) return true;
    if (item.grade && `${item.grade}級`.toLowerCase().includes(q)) return true;
    if (item.seasons.some(s => s.toLowerCase().includes(q))) return true;
    if ((item.miniNote ?? '').toLowerCase().includes(q)) return true;
    if ((item.pros ?? '').toLowerCase().includes(q)) return true;
    if ((item.cons ?? '').toLowerCase().includes(q)) return true;
    if ((item.remark ?? '').toLowerCase().includes(q)) return true;
    if (meta?.catNames && item.categoryId && (meta.catNames[item.categoryId] ?? '').toLowerCase().includes(q)) return true;
    if (meta?.originNames && item.originId && (meta.originNames[item.originId] ?? '').toLowerCase().includes(q)) return true;
    if (meta?.colorNames && item.colorIds.some(cid => (meta.colorNames![cid] ?? '').toLowerCase().includes(q))) return true;
    return false;
  });
}

// ── Vote counts ───────────────────────────────────────────────

export async function getVoteCount(db: SQLiteDatabase, itemId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT count FROM vote_counts WHERE item_id = ?',
    [itemId]
  );
  return row?.count ?? 0;
}

export async function addVote(db: SQLiteDatabase, itemId: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO vote_counts (item_id, count) VALUES (?, 1)
     ON CONFLICT(item_id) DO UPDATE SET count = count + 1`,
    [itemId]
  );
}

export async function getAllVoteCounts(db: SQLiteDatabase): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ item_id: string; count: number }>(
    'SELECT item_id, count FROM vote_counts'
  );
  return Object.fromEntries(rows.map(r => [r.item_id, r.count]));
}
