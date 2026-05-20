// Web-only in-memory SQL mock — pattern-matches service queries, no real SQL parsing
import {
  MOCK_CATEGORIES, MOCK_ORIGINS, MOCK_COLORS,
  MOCK_ITEMS, MOCK_OUTFITS, MOCK_VOTE_COUNTS,
} from './mockData.web';

type Row = Record<string, unknown>;

// ── In-memory store (singleton) ────────────────────────────────
const store = {
  items:       JSON.parse(JSON.stringify(MOCK_ITEMS))       as Row[],
  outfits:     JSON.parse(JSON.stringify(MOCK_OUTFITS))     as Row[],
  categories:  JSON.parse(JSON.stringify(MOCK_CATEGORIES))  as Row[],
  origins:     JSON.parse(JSON.stringify(MOCK_ORIGINS))     as Row[],
  colors:      JSON.parse(JSON.stringify(MOCK_COLORS))      as Row[],
  vote_counts: JSON.parse(JSON.stringify(MOCK_VOTE_COUNTS)) as Row[],
  settings:    [] as Row[],
};

// ── Helpers ────────────────────────────────────────────────────

function getTable(sql: string): string {
  // Handles both "FROM table" and "INTO table" and "UPDATE table"
  const m = sql.match(/(?:from|into|update|join)\s+(\w+)/i);
  return m ? m[1].toLowerCase() : '';
}

function tableRows(table: string): Row[] {
  return (store as Record<string, Row[]>)[table] ?? [];
}

function sortRows(rows: Row[], sql: string): Row[] {
  const m = sql.match(/order\s+by\s+([\w.]+)\s*(asc|desc)?/i);
  if (!m) return rows;
  const field = m[1].includes('.') ? m[1].split('.')[1] : m[1]; // handle "o.date"
  const dir = (m[2] ?? 'asc').toLowerCase();
  return [...rows].sort((a, b) => {
    const av = String(a[field] ?? '');
    const bv = String(b[field] ?? '');
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
}

// ── SELECT ─────────────────────────────────────────────────────

function handleSelect(sql: string, params: unknown[]): Row[] {
  const s = sql.toLowerCase().trim();

  // PRAGMA user_version
  if (s.includes('pragma user_version')) {
    return [{ user_version: 2 }];
  }

  // COUNT(*) queries
  if (s.includes('count(*)')) {
    const table = getTable(s);
    return [{ count: tableRows(table).length }];
  }

  // Outfit by item ID: json_each pattern
  if (s.includes('json_each') && s.includes('item_ids')) {
    const itemId = params[0] as string;
    const rows = store.outfits.filter(o => {
      const ids: string[] = JSON.parse(String(o.item_ids ?? '[]'));
      return ids.includes(itemId);
    });
    return sortRows(rows, s);
  }

  // vote_counts special: SELECT item_id, count FROM vote_counts
  if (s.includes('from vote_counts') && !s.includes('where')) {
    return [...store.vote_counts];
  }
  if (s.includes('from vote_counts') && s.includes('where item_id')) {
    const id = params[0] as string;
    return store.vote_counts.filter(r => r.item_id === id);
  }

  // settings: SELECT value FROM settings WHERE key = ?
  if (s.includes('from settings')) {
    const key = params[0] as string;
    return store.settings.filter(r => r.key === key);
  }

  // category max sort_order
  if (s.includes('from categories') && s.includes('sort_order desc limit 1')) {
    const sorted = sortRows([...store.categories], 'order by sort_order desc');
    return sorted.length ? [{ sort_order: sorted[0].sort_order }] : [];
  }

  const table = getTable(s);
  let rows = [...tableRows(table)];

  // ── WHERE filtering ──────────────────────────────────────────
  if (s.includes('where deleted_at is null')) {
    rows = rows.filter(r => !r.deleted_at);
  }
  if (s.includes('where deleted_at is not null')) {
    rows = rows.filter(r => !!r.deleted_at);
  }
  if (s.includes('deleted_at is not null') && s.includes('deleted_at <')) {
    const cutoff = params[0] as string;
    rows = rows.filter(r => !!r.deleted_at && String(r.deleted_at) < cutoff);
  }
  if (s.match(/where\s+id\s*=\s*\?/)) {
    rows = rows.filter(r => r.id === params[0]);
  }
  // WHERE id = ? AND deleted_at IS NULL
  if (s.match(/where\s+id\s*=\s*\?\s+and\s+deleted_at/)) {
    rows = rows.filter(r => r.id === params[0] && !r.deleted_at);
  }
  // origins: WHERE deleted = 0
  if (s.includes('where deleted = 0') || s.includes('deleted = 0')) {
    rows = rows.filter(r => !r.deleted);
  }
  // Hardcoded name search: WHERE name = '未分類'
  const nameMatch = s.match(/where\s+name\s*=\s*'([^']+)'/);
  if (nameMatch) {
    rows = rows.filter(r => r.name === nameMatch[1]);
  }
  // photo_ids not empty
  if (s.includes("photo_ids != '[]'")) {
    rows = rows.filter(r => r.photo_ids !== '[]');
  }
  // color_ids not empty
  if (s.includes("color_ids != '[]'")) {
    rows = rows.filter(r => r.color_ids !== '[]');
  }

  return sortRows(rows, s);
}

// ── INSERT ─────────────────────────────────────────────────────

function handleInsert(sql: string, params: unknown[]): void {
  const m = sql.match(/insert\s+(?:or\s+\w+\s+)?into\s+(\w+)\s*\(([^)]+)\)/i);
  if (!m) return;
  const [, table, colsStr] = m;
  const cols = colsStr.split(',').map(c => c.trim());
  const row: Row = {};
  cols.forEach((col, i) => { row[col] = i < params.length ? params[i] : null; });
  tableRows(table).push(row);
}

function handleUpsertVoteCount(params: unknown[]): void {
  const itemId = params[0] as string;
  const existing = store.vote_counts.find(r => r.item_id === itemId);
  if (existing) {
    existing.count = (Number(existing.count) || 0) + 1;
  } else {
    store.vote_counts.push({ item_id: itemId, count: 1 });
  }
}

// ── UPDATE ─────────────────────────────────────────────────────

function parseSetValues(sql: string, params: unknown[]): [Row, string | null] {
  // Extract the SET clause (between SET and WHERE)
  const setMatch = sql.match(/set\s+(.*?)(?:\s+where|$)/is);
  if (!setMatch) return [{}, null];

  const setParts = setMatch[1].trim();
  const result: Row = {};
  let paramIdx = 0;

  // Extract WHERE id = ? to get the target id (last ? param usually)
  let targetId: string | null = null;
  const whereIdMatch = sql.match(/where\s+\w+\s*=\s*\?/i);
  if (whereIdMatch) {
    // Count total ? in full SQL to find which param is the id
    const totalQ = (sql.match(/\?/g) ?? []).length;
    targetId = params[totalQ - 1] as string;
  }

  // Parse each SET assignment
  const assignments = setParts.split(/,\s*(?=\w+\s*=)/);
  for (const assign of assignments) {
    const eqIdx = assign.indexOf('=');
    if (eqIdx === -1) continue;
    const col = assign.slice(0, eqIdx).trim();
    const val = assign.slice(eqIdx + 1).trim();

    if (val === '?') {
      result[col] = params[paramIdx++];
    } else if (val.toUpperCase() === 'NULL') {
      result[col] = null;
    } else if (val.includes('+ 1') || val.includes('+1')) {
      result[col] = '__increment__';
    } else if (val.startsWith("'") && val.endsWith("'")) {
      result[col] = val.slice(1, -1);
    } else {
      result[col] = val;
    }
  }

  return [result, targetId];
}

function handleUpdate(sql: string, params: unknown[]): void {
  const tableMatch = sql.match(/update\s+(\w+)\s+set/i);
  if (!tableMatch) return;
  const table = tableMatch[1].toLowerCase();
  const rows = tableRows(table);

  // ON CONFLICT upsert for vote_counts
  if (sql.includes('ON CONFLICT') || sql.includes('on conflict')) {
    handleUpsertVoteCount(params);
    return;
  }

  const [setVals, targetId] = parseSetValues(sql, params);

  // WHERE item_id = ? (for vote_counts update)
  const whereItemMatch = sql.match(/where\s+item_id\s*=\s*\?/i);
  if (whereItemMatch) {
    const id = params[params.length - 1] as string;
    const row = rows.find(r => r.item_id === id);
    if (row) applySet(row, setVals);
    return;
  }

  // WHERE id = ?
  if (targetId) {
    const row = rows.find(r => r.id === targetId);
    if (row) applySet(row, setVals);
    return;
  }

  // WHERE origin_id = ? (cascade update category)
  const whereOriginMatch = sql.match(/where\s+origin_id\s*=\s*\?/i);
  if (whereOriginMatch) {
    const id = params[0] as string;
    rows.filter(r => r.origin_id === id).forEach(r => applySet(r, setVals));
    return;
  }

  // WHERE category_id = ? (cascade update)
  const whereCatMatch = sql.match(/where\s+category_id\s*=\s*\?/i);
  if (whereCatMatch) {
    const newVal = params[0];
    const oldVal = params[1];
    rows.filter(r => r.category_id === oldVal).forEach(r => { r.category_id = newVal; });
    return;
  }
}

function applySet(row: Row, setVals: Row): void {
  for (const [col, val] of Object.entries(setVals)) {
    if (val === '__increment__') {
      row[col] = (Number(row[col]) || 0) + 1;
    } else {
      row[col] = val;
    }
  }
}

// ── DELETE ─────────────────────────────────────────────────────

function handleDelete(sql: string, params: unknown[]): void {
  const tableMatch = sql.match(/delete\s+from\s+(\w+)/i);
  if (!tableMatch) return;
  const table = tableMatch[1].toLowerCase();
  const rows = tableRows(table);

  // WHERE id = ?
  if (sql.match(/where\s+id\s*=\s*\?/i)) {
    const id = params[0] as string;
    const idx = rows.findIndex(r => r.id === id);
    if (idx !== -1) rows.splice(idx, 1);
    return;
  }
  // WHERE item_id = ?
  if (sql.match(/where\s+item_id\s*=\s*\?/i)) {
    const id = params[0] as string;
    const idx = rows.findIndex(r => r.item_id === id);
    if (idx !== -1) rows.splice(idx, 1);
    return;
  }
}

// ── Public mock DB interface ───────────────────────────────────

let _instance: MockDb | null = null;

class MockDb {
  async getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.trim().toUpperCase();
    if (s.startsWith('SELECT') || s.startsWith('PRAGMA')) {
      return handleSelect(sql, params ?? []) as T[];
    }
    return [];
  }

  async getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows[0] ?? null;
  }

  async runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const s = sql.trim().toUpperCase();
    if (s.startsWith('INSERT')) handleInsert(sql, params ?? []);
    else if (s.startsWith('UPDATE')) handleUpdate(sql, params ?? []);
    else if (s.startsWith('DELETE')) handleDelete(sql, params ?? []);
    return { lastInsertRowId: 0, changes: 1 };
  }

  async execAsync(_sql: string): Promise<void> {
    // DDL / PRAGMA — no-op on web mock
  }
}

export function getMockDb(): MockDb {
  if (!_instance) _instance = new MockDb();
  return _instance;
}
