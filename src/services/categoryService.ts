import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, Color, Origin } from '../types';

// ── Categories ────────────────────────────────────────────────

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<{
    id: string; name: string; color: string;
    sort_order: number; is_default: number; created_at: string;
  }>('SELECT * FROM categories ORDER BY sort_order ASC');
  return rows.map(rowToCategory);
}

export async function addCategory(
  db: SQLiteDatabase,
  name: string,
  color: string
): Promise<Category> {
  const existing = await db.getAllAsync<{ sort_order: number }>(
    'SELECT sort_order FROM categories ORDER BY sort_order DESC LIMIT 1'
  );
  const sortOrder = existing.length > 0 ? existing[0].sort_order + 1 : 0;
  const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO categories (id, name, color, sort_order, is_default, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [id, name.trim(), color, sortOrder, now]
  );
  return { id, name: name.trim(), color, sortOrder, isDefault: false, createdAt: now };
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  name: string,
  color: string
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, color = ? WHERE id = ?',
    [name.trim(), color, id]
  );
}

export async function deleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  // Remap items to 未分類 (find the default uncategorised)
  const uncategorised = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM categories WHERE name = '未分類' LIMIT 1"
  );
  if (uncategorised) {
    await db.runAsync(
      'UPDATE items SET category_id = ? WHERE category_id = ?',
      [uncategorised.id, id]
    );
  } else {
    await db.runAsync('UPDATE items SET category_id = NULL WHERE category_id = ?', [id]);
  }
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function reorderCategories(db: SQLiteDatabase, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [i, ids[i]]);
  }
}

function rowToCategory(row: {
  id: string; name: string; color: string;
  sort_order: number; is_default: number; created_at: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
  };
}

// ── Origins ───────────────────────────────────────────────────

export async function getOrigins(db: SQLiteDatabase): Promise<Origin[]> {
  const rows = await db.getAllAsync<{
    id: string; name: string; is_default: number; deleted: number; created_at: string;
  }>('SELECT * FROM origins WHERE deleted = 0 ORDER BY is_default DESC, name ASC');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    isDefault: r.is_default === 1,
    deleted: r.deleted === 1,
    createdAt: r.created_at,
  }));
}

export async function addOrigin(db: SQLiteDatabase, name: string): Promise<Origin> {
  const id = `origin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO origins (id, name, is_default, deleted, created_at) VALUES (?, ?, 0, 0, ?)',
    [id, name.trim(), now]
  );
  return { id, name: name.trim(), isDefault: false, deleted: false, createdAt: now };
}

export async function deleteOrigin(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE items SET origin_id = NULL WHERE origin_id = ?', [id]);
  await db.runAsync('UPDATE origins SET deleted = 1 WHERE id = ?', [id]);
}

// ── Colors ────────────────────────────────────────────────────

export async function getColors(db: SQLiteDatabase): Promise<Color[]> {
  const rows = await db.getAllAsync<{
    id: string; name: string; is_default: number; created_at: string;
  }>('SELECT * FROM colors ORDER BY is_default DESC, name ASC');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    isDefault: r.is_default === 1,
    createdAt: r.created_at,
  }));
}

export async function addColor(db: SQLiteDatabase, name: string): Promise<Color> {
  const id = `color-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO colors (id, name, is_default, created_at) VALUES (?, ?, 0, ?)',
    [id, name.trim(), now]
  );
  return { id, name: name.trim(), isDefault: false, createdAt: now };
}

export async function deleteColor(db: SQLiteDatabase, id: string): Promise<void> {
  // Remove color from all items that reference it
  const items = await db.getAllAsync<{ id: string; color_ids: string }>(
    "SELECT id, color_ids FROM items WHERE color_ids != '[]'"
  );
  for (const item of items) {
    const colorIds: string[] = JSON.parse(item.color_ids || '[]');
    const updated = colorIds.filter(cid => cid !== id);
    if (updated.length !== colorIds.length) {
      await db.runAsync('UPDATE items SET color_ids = ? WHERE id = ?', [
        JSON.stringify(updated),
        item.id,
      ]);
    }
  }
  await db.runAsync('DELETE FROM colors WHERE id = ?', [id]);
}
