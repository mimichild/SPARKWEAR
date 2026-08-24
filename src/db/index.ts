import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
export { DB_NAME } from './schema';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ORIGINS,
  DEFAULT_COLORS,
} from '../constants/defaults';
import { DEFAULT_THEME_COLOR, DEFAULT_FONT_KEY } from '../constants/theme';
import { repairStaleReconciledLogDates } from '../services/usageLogService';

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);
  await runMigrations(db);
  await seedDefaults(db);
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current < 2) {
    // v1 → v2：items 加 deleted_at（暫存區功能）
    try { await db.runAsync('ALTER TABLE items ADD COLUMN deleted_at TEXT'); } catch { /* already exists */ }
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted_at)');
    await db.runAsync('PRAGMA user_version = 2');
  }
  if (current < 3) {
    // v2 → v3：新增 item_usage_logs，並從既有穿搭補種歷史紀錄
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS item_usage_logs (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        logged_at TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'outfit',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_usage_logs_item ON item_usage_logs(item_id);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON item_usage_logs(logged_at);
    `);
    // 從既有穿搭資料補種使用紀錄
    const outfits = await db.getAllAsync<{ id: string; date: string; item_ids: string }>(
      'SELECT id, date, item_ids FROM outfits'
    );
    const now = new Date().toISOString();
    for (const outfit of outfits) {
      const itemIds: string[] = JSON.parse(outfit.item_ids || '[]');
      for (const itemId of itemIds) {
        await db.runAsync(
          'INSERT OR IGNORE INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
          [`log-seed-${outfit.id}-${itemId}`, itemId, outfit.date, 'outfit', now]
        );
      }
    }
    await db.runAsync('PRAGMA user_version = 3');
  }
  if (current < 4) {
    // v3 → v4：補填 item_usage_logs 歷史缺口
    // items.usage_count 可能因早期手動登錄而高於 item_usage_logs 的筆數
    const gapRows = await db.getAllAsync<{
      id: string; usage_count: number; log_count: number;
      purchase_date: string | null; created_at: string;
    }>(
      `SELECT i.id, i.usage_count, COUNT(l.id) as log_count,
              i.purchase_date, i.created_at
       FROM items i
       LEFT JOIN item_usage_logs l ON l.item_id = i.id
       WHERE i.deleted_at IS NULL
       GROUP BY i.id
       HAVING i.usage_count > COUNT(l.id)`
    );
    const now = new Date().toISOString();
    for (const row of gapRows) {
      const gap = row.usage_count - row.log_count;
      const date = row.purchase_date ?? row.created_at.slice(0, 10);
      for (let i = 0; i < gap; i++) {
        await db.runAsync(
          'INSERT OR IGNORE INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
          [`log-migration4-${row.id}-${i}`, row.id, date, 'migration', now]
        );
      }
    }
    await db.runAsync('PRAGMA user_version = 4');
  }
  if (current < 5) {
    // v4 → v5：修正舊版 reconcileUsageLogs／v3→v4 migration 用購買日期／建立日期
    // 補插 item_usage_logs 造成「未使用天數」失真的問題，見 usageLogService.ts
    // repairStaleReconciledLogDates 的說明
    await repairStaleReconciledLogDates(db);
    await db.runAsync('PRAGMA user_version = 5');
  }
}

async function seedDefaults(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  const catCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if (catCount?.count === 0) {
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const { name, color } = DEFAULT_CATEGORIES[i];
      const id = `cat-default-${i}`;
      await db.runAsync(
        'INSERT INTO categories (id, name, color, sort_order, is_default, created_at) VALUES (?, ?, ?, ?, 1, ?)',
        [id, name, color, i, now]
      );
    }
  }

  const originCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM origins'
  );
  if (originCount?.count === 0) {
    for (let i = 0; i < DEFAULT_ORIGINS.length; i++) {
      const name = DEFAULT_ORIGINS[i];
      const id = `origin-default-${i}`;
      await db.runAsync(
        'INSERT INTO origins (id, name, is_default, deleted, created_at) VALUES (?, ?, 1, 0, ?)',
        [id, name, now]
      );
    }
  }

  const colorCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM colors'
  );
  if (colorCount?.count === 0) {
    for (let i = 0; i < DEFAULT_COLORS.length; i++) {
      const name = DEFAULT_COLORS[i];
      const id = `color-default-${i}`;
      await db.runAsync(
        'INSERT INTO colors (id, name, is_default, created_at) VALUES (?, ?, 1, ?)',
        [id, name, now]
      );
    }
  }

  const themeRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'themeColor'"
  );
  if (!themeRow) {
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('themeColor', ?)",
      [DEFAULT_THEME_COLOR]
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('fontKey', ?)",
      [DEFAULT_FONT_KEY]
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('isProUnlocked', 'false')"
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('purchaseSort', 'desc')"
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('outfitSort', 'desc')"
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('rankingPeriod', 'month')"
    );
  }
}

