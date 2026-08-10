import type { SQLiteDatabase } from 'expo-sqlite';
import type { Outfit, SortOrder } from '../types';
import { decrementUsageCount } from './itemService';
import { removeItemUsages } from './usageLogService';

// ── Serialization ─────────────────────────────────────────────

type OutfitRow = {
  id: string; date: string; time: string | null;
  weather: string | null; temperature: string | null;
  county: string | null; place: string | null; note: string | null;
  photo_ids: string; item_ids: string;
  created_at: string; updated_at: string;
};

function rowToOutfit(row: OutfitRow): Outfit {
  return {
    id: row.id,
    date: row.date,
    time: row.time ?? undefined,
    weather: row.weather ?? undefined,
    temperature: row.temperature ?? undefined,
    county: row.county ?? undefined,
    place: row.place ?? undefined,
    note: row.note ?? undefined,
    photoIds: JSON.parse(row.photo_ids || '[]'),
    itemIds: JSON.parse(row.item_ids || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── CRUD ──────────────────────────────────────────────────────

export async function getOutfits(
  db: SQLiteDatabase,
  sort: SortOrder = 'desc'
): Promise<Outfit[]> {
  const order = sort === 'asc' ? 'ASC' : 'DESC';
  const rows = await db.getAllAsync<OutfitRow>(
    `SELECT * FROM outfits ORDER BY date ${order}, created_at ${order}`
  );
  return rows.map(rowToOutfit);
}

export async function getOutfitById(
  db: SQLiteDatabase,
  id: string
): Promise<Outfit | null> {
  const row = await db.getFirstAsync<OutfitRow>(
    'SELECT * FROM outfits WHERE id = ?',
    [id]
  );
  return row ? rowToOutfit(row) : null;
}

export async function getOutfitsByItemId(
  db: SQLiteDatabase,
  itemId: string
): Promise<Outfit[]> {
  const rows = await db.getAllAsync<OutfitRow>(
    `SELECT DISTINCT o.* FROM outfits o, json_each(o.item_ids) j
     WHERE j.value = ?
     ORDER BY o.date DESC, o.created_at DESC`,
    [itemId]
  );
  return rows.map(rowToOutfit);
}

export async function saveOutfit(
  db: SQLiteDatabase,
  data: Omit<Outfit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Outfit> {
  const id = `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO outfits (
      id, date, time, weather, temperature, county, place, note,
      photo_ids, item_ids, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.date,
      data.time ?? null,
      data.weather ?? null,
      data.temperature ?? null,
      data.county ?? null,
      data.place ?? null,
      data.note ?? null,
      JSON.stringify(data.photoIds ?? []),
      JSON.stringify(data.itemIds ?? []),
      now, now,
    ]
  );

  return { ...data, id, createdAt: now, updatedAt: now };
}

export async function updateOutfit(
  db: SQLiteDatabase,
  id: string,
  data: Partial<Omit<Outfit, 'id' | 'createdAt'>>
): Promise<void> {
  const existing = await getOutfitById(db, id);
  if (!existing) throw new Error(`Outfit not found: ${id}`);

  const merged = { ...existing, ...data };
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE outfits SET
      date = ?, time = ?, weather = ?, temperature = ?,
      county = ?, place = ?, note = ?,
      photo_ids = ?, item_ids = ?, updated_at = ?
    WHERE id = ?`,
    [
      merged.date,
      merged.time ?? null,
      merged.weather ?? null,
      merged.temperature ?? null,
      merged.county ?? null,
      merged.place ?? null,
      merged.note ?? null,
      JSON.stringify(merged.photoIds ?? []),
      JSON.stringify(merged.itemIds ?? []),
      now,
      id,
    ]
  );
}

export async function deleteOutfit(db: SQLiteDatabase, id: string): Promise<void> {
  const outfit = await getOutfitById(db, id);
  if (outfit && outfit.itemIds.length > 0) {
    for (const itemId of outfit.itemIds) {
      await decrementUsageCount(db, itemId);
    }
    await removeItemUsages(db, outfit.itemIds, outfit.date, 'outfit');
  }
  await db.runAsync('DELETE FROM outfits WHERE id = ?', [id]);
}

// ── Search ────────────────────────────────────────────────────

export function filterOutfits(outfits: Outfit[], query: string): Outfit[] {
  if (!query.trim()) return outfits;
  const q = query.toLowerCase().trim();
  return outfits.filter(o =>
    (o.date ?? '').includes(q) ||
    (o.weather ?? '').toLowerCase().includes(q) ||
    (o.temperature ?? '').toLowerCase().includes(q) ||
    (o.county ?? '').toLowerCase().includes(q) ||
    (o.place ?? '').toLowerCase().includes(q) ||
    (o.note ?? '').toLowerCase().includes(q)
  );
}
