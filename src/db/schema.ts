export const DB_NAME = 'sparkwear.db';
export const DB_VERSION = 2;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  thumb_path TEXT,
  grid_path TEXT,
  detail_path TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  profile TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS origins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS colors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  brand TEXT,
  name TEXT NOT NULL,
  purchase_date TEXT,
  purchase_time TEXT,
  category_id TEXT REFERENCES categories(id),
  origin_id TEXT REFERENCES origins(id),
  color_ids TEXT NOT NULL DEFAULT '[]',
  grade TEXT CHECK(grade IN ('A','B','C','D','E') OR grade IS NULL),
  original_price REAL,
  special_price REAL,
  discount_price REAL,
  size TEXT,
  weight TEXT,
  body_type TEXT,
  suggested_weight TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  seasons TEXT NOT NULL DEFAULT '[]',
  mini_note TEXT,
  pros TEXT,
  cons TEXT,
  remark TEXT,
  photo_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted_at);

CREATE TABLE IF NOT EXISTS outfits (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  weather TEXT,
  temperature TEXT,
  county TEXT,
  place TEXT,
  note TEXT,
  photo_ids TEXT NOT NULL DEFAULT '[]',
  item_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vote_counts (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_purchase_date ON items(purchase_date);
CREATE INDEX IF NOT EXISTS idx_outfits_date ON outfits(date);
`;
