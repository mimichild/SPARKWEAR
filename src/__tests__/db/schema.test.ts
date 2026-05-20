import { CREATE_TABLES_SQL, DB_NAME, DB_VERSION } from '../../db/schema';

describe('db/schema', () => {
  describe('DB 常數', () => {
    it('DB_NAME 為 sparkwear.db', () => {
      expect(DB_NAME).toBe('sparkwear.db');
    });

    it('DB_VERSION 為 2（含暫存區 migration）', () => {
      expect(DB_VERSION).toBe(2);
    });
  });

  describe('CREATE_TABLES_SQL', () => {
    it('SQL 字串不為空', () => {
      expect(CREATE_TABLES_SQL.trim().length).toBeGreaterThan(0);
    });

    it('包含 items 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS items');
    });

    it('包含 outfits 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS outfits');
    });

    it('包含 categories 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS categories');
    });

    it('包含 origins 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS origins');
    });

    it('包含 colors 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS colors');
    });

    it('包含 photos 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS photos');
    });

    it('包含 vote_counts 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS vote_counts');
    });

    it('包含 settings 資料表', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS settings');
    });

    it('items 有 usage_count 欄位（預設 0）', () => {
      expect(CREATE_TABLES_SQL).toContain('usage_count INTEGER NOT NULL DEFAULT 0');
    });

    it('items 有 grade CHECK 約束', () => {
      expect(CREATE_TABLES_SQL).toContain("CHECK(grade IN ('A','B','C','D','E')");
    });

    it('items 有 photo_ids 欄位（JSON array）', () => {
      expect(CREATE_TABLES_SQL).toContain("photo_ids TEXT NOT NULL DEFAULT '[]'");
    });

    it('outfits 有 item_ids 欄位（JSON array）', () => {
      expect(CREATE_TABLES_SQL).toContain("item_ids TEXT NOT NULL DEFAULT '[]'");
    });

    it('包含 WAL journal mode', () => {
      expect(CREATE_TABLES_SQL).toContain('PRAGMA journal_mode = WAL');
    });

    it('包含 foreign key 支援', () => {
      expect(CREATE_TABLES_SQL).toContain('PRAGMA foreign_keys = ON');
    });

    it('包含 items 的 category 索引', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_items_category');
    });
  });
});
