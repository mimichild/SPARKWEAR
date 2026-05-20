import { Platform } from 'react-native';
import JSZip from 'jszip';
import { Unzip, UnzipInflate, strFromU8 } from 'fflate';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getItems } from './itemService';
import { getOutfits } from './outfitService';
import { getCategories, getOrigins, getColors } from './categoryService';
import { getAllVoteCounts } from './itemService';
import { ensurePhotosDirExists } from './photoService';
import type {
  Item, Outfit, Category, Origin, Color, VoteCount,
  BackupManifest, BackupPhotoEntry,
  LegacyManifest, LegacyItem, LegacyOutfit,
  ImportMode, ImportResult,
} from '../types';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

// ── Pure helpers (exported for testing) ──────────────────────

/**
 * Build a remap of manifest IDs → actual DB IDs, matched by name.
 *
 * Problem this solves: in merge mode, a category/origin whose *name* already
 * exists in the DB is silently skipped by INSERT OR IGNORE (UNIQUE constraint).
 * Its manifest ID therefore never lands in the DB, but imported items still
 * reference it → SQLite FOREIGN KEY error (FK violations are NOT swallowed by
 * OR IGNORE).  Solution: after inserting, look up each manifest entry by name
 * in the DB and remap items to use the real DB ID.
 *
 * @param manifestEntries  Categories or origins from the backup manifest
 * @param nameToDbId       Map of name → actual DB id (queried after insertion)
 */
export function buildIdRemap(
  manifestEntries: Array<{ id: string; name: string }>,
  nameToDbId: Record<string, string>
): Record<string, string> {
  const remap: Record<string, string> = {};
  for (const entry of manifestEntries) {
    const dbId = nameToDbId[entry.name];
    if (dbId && dbId !== entry.id) remap[entry.id] = dbId;
  }
  return remap;
}

/** Extract filename from a full or relative path */
export function photoFilenameFromPath(path: string): string {
  if (!path) return '';
  return path.split('/').pop() ?? path;
}

/** Convert absolute photo path → relative path for manifest */
export function photoRelativePath(path: string): string {
  return `photos/${photoFilenameFromPath(path)}`;
}

/** Convert relative path from manifest → absolute path on this device */
export function photoAbsolutePath(relativePath: string): string {
  const filename = relativePath.split('/').pop() ?? relativePath;
  return `${FileSystem.documentDirectory}photos/${filename}`;
}

/** Extract photoId from legacy photo key.
 *  Handles both "storage:photoId" and "idb:photoId" formats.
 */
export function parseV4PhotoKey(key: string): string | null {
  for (const prefix of ['storage:', 'idb:']) {
    if (key.startsWith(prefix)) {
      const id = key.slice(prefix.length);
      return id || null;
    }
  }
  return null;
}

/** Map a single v4 LegacyItem → v5 Item (photoIds are relative paths) */
export function mapV4ItemToV5(
  legacy: LegacyItem,
  catsByName: Record<string, string>,
  originsByName: Record<string, string>,
  keyToRelativePath: Record<string, string>,
): Item {
  const now = legacy.createdAt ?? new Date().toISOString();
  const photoIds = (legacy.itemPhotos ?? [])
    .map(p => (p.bundleKey ? keyToRelativePath[p.bundleKey] : undefined))
    .filter((p): p is string => !!p);

  return {
    id: legacy.id,
    brand: legacy.brand,
    name: legacy.name,
    purchaseDate: legacy.purchaseDate,
    categoryId: legacy.category ? catsByName[legacy.category] : undefined,
    originId: legacy.origin ? originsByName[legacy.origin] : undefined,
    colorIds: [],
    grade: legacy.grade as Item['grade'],
    originalPrice: legacy.originalPrice,
    specialPrice: legacy.specialPrice,
    discountPrice: legacy.discountPrice,
    size: legacy.size,
    weight: legacy.weight,
    bodyType: legacy.bodyType,
    suggestedWeight: legacy.suggestedWeight,
    usageCount: legacy.wearCountTotal ?? 0,
    seasons: (legacy.seasons ?? []) as Item['seasons'],
    miniNote: legacy.miniNote,
    pros: legacy.pros,
    cons: legacy.cons,
    remark: legacy.remark,
    photoIds,
    createdAt: now,
    updatedAt: now,
  };
}

/** Map a single v4 LegacyOutfit → v5 Outfit (photoIds are relative paths) */
export function mapV4OutfitToV5(
  legacy: LegacyOutfit,
  keyToRelativePath: Record<string, string>,
): Outfit {
  const now = legacy.createdAt ?? new Date().toISOString();
  const photoIds = (legacy.outfitPhotos ?? [])
    .map(p => (p.bundleKey ? keyToRelativePath[p.bundleKey] : undefined))
    .filter((p): p is string => !!p);

  return {
    id: legacy.id,
    date: legacy.date ?? now.slice(0, 10),
    time: legacy.time,
    weather: legacy.weather,
    temperature: legacy.temperature,
    county: legacy.county,
    place: legacy.place,
    note: legacy.note ?? legacy.notes ?? legacy.feeling ?? legacy.thoughts ?? legacy.memo,
    photoIds,
    itemIds: legacy.wornItemIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

// ── Export ────────────────────────────────────────────────────

export async function exportBackup(
  db: SQLiteDatabase,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Export is not supported on web');

  onProgress?.('reading', 0, 1);
  const [items, outfits, categories, origins, colors, voteCountsMap] = await Promise.all([
    getItems(db),
    getOutfits(db),
    getCategories(db),
    getOrigins(db),
    getColors(db),
    getAllVoteCounts(db),
  ]);

  const zip = new JSZip();
  const photoFolder = zip.folder('photos')!;

  // Collect unique photo paths from items + outfits
  const allPaths = new Set<string>();
  items.forEach(i => i.photoIds.forEach(p => allPaths.add(p)));
  outfits.forEach(o => o.photoIds.forEach(p => allPaths.add(p)));

  const pathToRelative: Record<string, string> = {};
  const mediaPhotos: BackupPhotoEntry[] = [];
  const pathsArr = Array.from(allPaths);
  let packed = 0;

  for (const path of pathsArr) {
    const filename = photoFilenameFromPath(path);
    const normalizedPath = path.startsWith('file://') ? path.slice(7) : path;
    try {
      const info = await FileSystem.getInfoAsync(normalizedPath);
      if (info.exists) {
        const base64 = await FileSystem.readAsStringAsync(normalizedPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        photoFolder.file(filename, base64, { base64: true });
        const rel = `photos/${filename}`;
        pathToRelative[path] = rel;
        mediaPhotos.push({
          id: filename.replace(/\.[^.]+$/, ''),
          profile: 'detail',
          mimeType: 'image/jpeg',
          file: rel,
        });
      }
    } catch {
      // Skip unreadable files — note as missing
    }
    packed++;
    onProgress?.('packing', packed, pathsArr.length);
  }

  // Convert absolute paths → relative in exported records
  const exportItems: Item[] = items.map(item => ({
    ...item,
    photoIds: item.photoIds.map(p => pathToRelative[p] ?? p),
  }));
  const exportOutfits: Outfit[] = outfits.map(outfit => ({
    ...outfit,
    photoIds: outfit.photoIds.map(p => pathToRelative[p] ?? p),
  }));

  const voteCounts: VoteCount[] = Object.entries(voteCountsMap).map(
    ([itemId, count]) => ({ itemId, count })
  );

  const manifest: BackupManifest = {
    app: 'SPARKWEAR',
    version: 5,
    exportedAt: new Date().toISOString(),
    data: {
      items: exportItems,
      outfits: exportOutfits,
      categories,
      origins,
      colors,
      voteCounts,
      settings: {},
    },
    media: { photos: mediaPhotos },
  };

  zip.file('manifest.json', JSON.stringify(manifest));

  onProgress?.('sharing', 0, 1);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipPath = `${FileSystem.cacheDirectory}sparkwear_${timestamp}.zip`;

  // Generate as Blob → object URL → downloadAsync avoids holding the whole ZIP
  // as a base64 string in JS heap (prevents OOM on large backups)
  const blob = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    await FileSystem.downloadAsync(blobUrl, zipPath);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(zipPath, {
      mimeType: 'application/zip',
      dialogTitle: 'SPARKWEAR 備份',
    });
  }

  onProgress?.('done', 1, 1);
}

// ── Import ────────────────────────────────────────────────────

export async function importBackupFromPicker(
  db: SQLiteDatabase,
  mode: ImportMode,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/zip',
    copyToCacheDirectory: true,
  });

  if (picked.canceled || !picked.assets?.[0]) return null;
  return importBackupFromUri(db, picked.assets[0].uri, mode, onProgress);
}

export async function importBackupFromUri(
  db: SQLiteDatabase,
  uri: string,
  mode: ImportMode,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<ImportResult> {
  onProgress?.('reading', 0, 1);
  await ensurePhotosDirExists();

  // Stream the ZIP in ~64KB chunks via fflate — avoids loading the entire
  // file into the JS heap (prevents OOM on large backups)
  const { manifestText, relToAbs, savedPhotoCount, missingPhotoCount } =
    await streamExtractZip(uri, onProgress);

  onProgress?.('parsing', 0, 1);
  const raw = JSON.parse(manifestText) as { version: number };

  let manifest: BackupManifest;
  if (raw.version === 5) {
    manifest = raw as BackupManifest;
  } else if (raw.version === 4) {
    manifest = convertV4ToV5(raw as LegacyManifest);
  } else {
    throw new Error(`不支援的備份格式版本：${raw.version}`);
  }

  // DB writes
  if (mode === 'replace') {
    await db.runAsync('DELETE FROM vote_counts');
    await db.runAsync('DELETE FROM outfits');
    await db.runAsync('DELETE FROM items');
    await db.runAsync('DELETE FROM colors');
    await db.runAsync('DELETE FROM origins');
    await db.runAsync('DELETE FROM categories');
  }

  await insertCategories(db, manifest.data.categories, mode);
  await insertOrigins(db, manifest.data.origins, mode);
  await insertColors(db, manifest.data.colors, mode);

  // After inserting categories/origins, build name→actual-DB-id maps.
  // In merge mode, a category/origin with a duplicate *name* gets INSERT OR IGNORE'd,
  // so its V4-generated ID never lands in the DB. Items that reference those IDs would
  // fail SQLite's FOREIGN KEY constraint (FK violations are NOT swallowed by OR IGNORE).
  // Fix: remap each item's categoryId/originId to the real DB id via name lookup.
  const catNameToId: Record<string, string> = {};
  (await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM categories'))
    .forEach(r => { catNameToId[r.name] = r.id; });

  const originNameToId: Record<string, string> = {};
  (await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM origins'))
    .forEach(r => { originNameToId[r.name] = r.id; });

  const catIdRemap    = buildIdRemap(manifest.data.categories, catNameToId);
  const originIdRemap = buildIdRemap(manifest.data.origins,    originNameToId);

  // Restore absolute photo paths and remap category/origin IDs
  const itemsToImport = manifest.data.items.map(item => ({
    ...item,
    categoryId: item.categoryId ? (catIdRemap[item.categoryId] ?? item.categoryId) : undefined,
    originId:   item.originId   ? (originIdRemap[item.originId]   ?? item.originId)   : undefined,
    photoIds: item.photoIds.map(p => relToAbs[p] ?? p),
  }));
  const outfitsToImport = manifest.data.outfits.map(outfit => ({
    ...outfit,
    photoIds: outfit.photoIds.map(p => relToAbs[p] ?? p),
  }));

  const importedItemCount = await insertItems(db, itemsToImport, mode);
  const importedOutfitCount = await insertOutfits(db, outfitsToImport, mode);
  await insertVoteCounts(db, manifest.data.voteCounts, mode);

  onProgress?.('done', 1, 1);

  return {
    success: true,
    itemCount: importedItemCount,
    outfitCount: importedOutfitCount,
    photoCount: savedPhotoCount,
    missingPhotoCount,
  };
}

// ── Streaming ZIP extraction (fflate + FileSystem chunked read) ──
// Reads the ZIP in 64 KB slices via FileSystem.readAsStringAsync(position, length).
// This avoids "Network request failed" from fetch('file://') on Android and
// keeps peak JS-heap usage to ~one decompressed photo (~2–5 MB) at a time.

interface StreamResult {
  manifestText: string;
  relToAbs: Record<string, string>;   // "photos/xyz.jpg" → absolute path
  savedPhotoCount: number;
  missingPhotoCount: number;
}

async function streamExtractZip(
  uri: string,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<StreamResult> {
  const fileUri = uri.startsWith('/') ? `file://${uri}` : uri;

  // Get file size first
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) throw new Error('備份檔案不存在，請重新選取');
  const fileSize = (info as { size?: number }).size;
  if (!fileSize) throw new Error('無法取得備份檔案大小');

  // Set up state shared between the async read loop and fflate callbacks
  let manifestText: string | null = null;
  const relToAbs: Record<string, string> = {};
  let savedPhotoCount = 0;
  let missingPhotoCount = 0;
  let pendingWrites = 0;
  let streamDone = false;
  let settled = false;
  let resolveResult!: (r: StreamResult) => void;
  let rejectResult!: (e: unknown) => void;

  const resultPromise = new Promise<StreamResult>((res, rej) => {
    resolveResult = res;
    rejectResult = rej;
  });

  const tryResolve = () => {
    if (!settled && streamDone && pendingWrites === 0 && manifestText !== null) {
      settled = true;
      resolveResult({ manifestText, relToAbs, savedPhotoCount, missingPhotoCount });
    }
  };

  const tryReject = (err: unknown) => {
    if (!settled) {
      settled = true;
      rejectResult(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const unzip = new Unzip(file => {
    if (file.name === 'manifest.json') {
      const chunks: Uint8Array[] = [];
      file.ondata = (err, dat, final) => {
        if (err) { tryReject(err); return; }
        if (dat) chunks.push(dat);
        if (final) {
          manifestText = strFromU8(concatUint8Arrays(chunks));
          tryResolve();
        }
      };
      file.start();

    } else if (file.name.startsWith('photos/') && file.name.length > 'photos/'.length) {
      const filename = file.name.split('/').pop();
      if (!filename) { missingPhotoCount++; return; }
      const destPath = `${PHOTOS_DIR}${filename}`;
      const chunks: Uint8Array[] = [];
      pendingWrites++;

      file.ondata = (err, dat, final) => {
        if (err) { missingPhotoCount++; pendingWrites--; tryResolve(); return; }
        if (dat) chunks.push(dat);
        if (final) {
          const merged = concatUint8Arrays(chunks);
          chunks.length = 0; // free before async write
          const base64 = uint8ArrayToBase64(merged);

          FileSystem.writeAsStringAsync(destPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          }).then(() => {
            relToAbs[file.name] = destPath;
            savedPhotoCount++;
            pendingWrites--;
            onProgress?.('importing', savedPhotoCount, savedPhotoCount + pendingWrites);
            tryResolve();
          }).catch(() => {
            missingPhotoCount++;
            pendingWrites--;
            tryResolve();
          });
        }
      };
      file.start();
    }
  });

  unzip.register(UnzipInflate);

  // Read the ZIP in 64 KB slices — never loads the full file into memory
  const CHUNK_SIZE = 64 * 1024;
  let offset = 0;
  try {
    while (offset < fileSize && !settled) {
      const chunkBytes = Math.min(CHUNK_SIZE, fileSize - offset);
      const isLast = offset + chunkBytes >= fileSize;

      const b64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length: chunkBytes,
      });

      // Convert base64 chunk → binary Uint8Array (only ~64 KB at a time)
      const binary = atob(b64);
      const chunk = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) chunk[i] = binary.charCodeAt(i);

      unzip.push(chunk, isLast);
      offset += chunkBytes;

      if (offset % (2 * 1024 * 1024) < CHUNK_SIZE) {
        onProgress?.('reading', offset, fileSize);
      }
    }
  } catch (e) {
    tryReject(e);
    return resultPromise;
  }

  streamDone = true;
  tryResolve();

  return resultPromise;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return btoa(binary);
}

// ── V4 → V5 conversion ────────────────────────────────────────

function convertV4ToV5(legacy: LegacyManifest): BackupManifest {
  // Build photo key → relative path map
  const keyToRelativePath: Record<string, string> = {};
  const mediaPhotos: BackupPhotoEntry[] = [];

  for (const entry of legacy.media.photos) {
    // Use the full key as lookup because items reference it via bundleKey
    // (e.g. bundleKey = "idb:uuid" matches key = "idb:uuid")
    keyToRelativePath[entry.key] = entry.file;
    const photoId = parseV4PhotoKey(entry.key) ?? entry.key;
    mediaPhotos.push({
      id: photoId,
      profile: 'detail',
      mimeType: entry.mimeType,
      file: entry.file,
    });
  }

  // Build category lookup by name
  const categoryColors = legacy.data.categoryColors ?? {};
  const catsByName: Record<string, string> = {};
  const categoriesV5: Category[] = [];
  const catNames = [
    ...(legacy.data.categoryOrder ?? []),
    ...Object.keys(categoryColors).filter(n => !(legacy.data.categoryOrder ?? []).includes(n)),
  ];
  catNames.forEach((name, i) => {
    const id = `cat-v4-${encodeURIComponent(name)}`;
    catsByName[name] = id;
    categoriesV5.push({
      id, name,
      color: categoryColors[name] ?? '#e0e0e0',
      sortOrder: i,
      isDefault: false,
      createdAt: legacy.exportedAt,
    });
  });

  // Build origin lookup by name
  const originsByName: Record<string, string> = {};
  const originsV5: Origin[] = [];
  const defaultOriginNames = ['日貨', '韓貨', '品牌', '蝦皮', '其他'];
  const allOriginNames = [
    ...defaultOriginNames,
    ...(legacy.data.customOrigins ?? []).filter(n => !defaultOriginNames.includes(n)),
  ];
  allOriginNames.forEach(name => {
    const id = `origin-v4-${encodeURIComponent(name)}`;
    originsByName[name] = id;
    const deleted = (legacy.data.deletedOrigins ?? []).includes(name);
    originsV5.push({ id, name, isDefault: false, deleted, createdAt: legacy.exportedAt });
  });

  // Map items and outfits
  const itemsV5 = (legacy.data.items ?? []).map(item =>
    mapV4ItemToV5(item, catsByName, originsByName, keyToRelativePath)
  );
  const outfitsV5 = (legacy.data.dailyLogs ?? []).map(log =>
    mapV4OutfitToV5(log, keyToRelativePath)
  );

  const voteCounts: VoteCount[] = Object.entries(legacy.data.manualVoteCounts ?? {})
    .map(([itemId, count]) => ({ itemId, count: count as number }));

  const colorsV5: Color[] = (legacy.data.refColors ?? []).map(c => ({
    id: c.id,
    name: c.name,
    isDefault: false,
    createdAt: legacy.exportedAt,
  }));

  return {
    app: 'SPARKWEAR',
    version: 5,
    exportedAt: legacy.exportedAt,
    data: {
      items: itemsV5,
      outfits: outfitsV5,
      categories: categoriesV5,
      origins: originsV5,
      colors: colorsV5,
      voteCounts,
      settings: {},
    },
    media: { photos: mediaPhotos },
  };
}

// ── DB insert helpers ─────────────────────────────────────────

async function insertCategories(
  db: SQLiteDatabase,
  categories: Category[],
  mode: ImportMode
): Promise<void> {
  const existing = mode === 'merge'
    ? new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM categories')).map(r => r.id))
    : new Set<string>();
  for (const c of categories) {
    if (mode === 'merge' && existing.has(c.id)) continue;
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, color, sort_order, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.color, c.sortOrder, c.isDefault ? 1 : 0, c.createdAt]
    );
  }
}

async function insertOrigins(
  db: SQLiteDatabase,
  origins: Origin[],
  mode: ImportMode
): Promise<void> {
  const existing = mode === 'merge'
    ? new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM origins')).map(r => r.id))
    : new Set<string>();
  for (const o of origins) {
    if (mode === 'merge' && existing.has(o.id)) continue;
    await db.runAsync(
      'INSERT OR IGNORE INTO origins (id, name, is_default, deleted, created_at) VALUES (?, ?, ?, ?, ?)',
      [o.id, o.name, o.isDefault ? 1 : 0, o.deleted ? 1 : 0, o.createdAt]
    );
  }
}

async function insertColors(
  db: SQLiteDatabase,
  colors: Color[],
  mode: ImportMode
): Promise<void> {
  const existing = mode === 'merge'
    ? new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM colors')).map(r => r.id))
    : new Set<string>();
  for (const c of colors) {
    if (mode === 'merge' && existing.has(c.id)) continue;
    await db.runAsync(
      'INSERT OR IGNORE INTO colors (id, name, is_default, created_at) VALUES (?, ?, ?, ?)',
      [c.id, c.name, c.isDefault ? 1 : 0, c.createdAt]
    );
  }
}

async function insertItems(
  db: SQLiteDatabase,
  items: Item[],
  mode: ImportMode
): Promise<number> {
  const existing = mode === 'merge'
    ? new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM items')).map(r => r.id))
    : new Set<string>();
  let count = 0;
  for (const item of items) {
    if (mode === 'merge' && existing.has(item.id)) continue;
    await db.runAsync(
      `INSERT OR IGNORE INTO items (
        id, brand, name, purchase_date, purchase_time,
        category_id, origin_id, color_ids, grade,
        original_price, special_price, discount_price,
        size, weight, body_type, suggested_weight,
        usage_count, seasons, mini_note, pros, cons, remark,
        photo_ids, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id, item.brand ?? null, item.name,
        item.purchaseDate ?? null, item.purchaseTime ?? null,
        item.categoryId ?? null, item.originId ?? null,
        JSON.stringify(item.colorIds), item.grade ?? null,
        item.originalPrice ?? null, item.specialPrice ?? null, item.discountPrice ?? null,
        item.size ?? null, item.weight ?? null, item.bodyType ?? null, item.suggestedWeight ?? null,
        item.usageCount, JSON.stringify(item.seasons),
        item.miniNote ?? null, item.pros ?? null, item.cons ?? null, item.remark ?? null,
        JSON.stringify(item.photoIds), item.createdAt, item.updatedAt,
      ]
    );
    count++;
  }
  return count;
}

async function insertOutfits(
  db: SQLiteDatabase,
  outfits: Outfit[],
  mode: ImportMode
): Promise<number> {
  const existing = mode === 'merge'
    ? new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM outfits')).map(r => r.id))
    : new Set<string>();
  let count = 0;
  for (const outfit of outfits) {
    if (mode === 'merge' && existing.has(outfit.id)) continue;
    await db.runAsync(
      `INSERT OR IGNORE INTO outfits
        (id, date, time, weather, temperature, county, place, note, photo_ids, item_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        outfit.id, outfit.date, outfit.time ?? null,
        outfit.weather ?? null, outfit.temperature ?? null,
        outfit.county ?? null, outfit.place ?? null, outfit.note ?? null,
        JSON.stringify(outfit.photoIds), JSON.stringify(outfit.itemIds),
        outfit.createdAt, outfit.updatedAt,
      ]
    );
    count++;
  }
  return count;
}

async function insertVoteCounts(
  db: SQLiteDatabase,
  voteCounts: VoteCount[],
  mode: ImportMode
): Promise<void> {
  if (voteCounts.length === 0) return;

  // Pre-fetch valid item IDs to skip vote_counts that reference non-existent items
  // (prevents FOREIGN KEY constraint failure when the item was skipped or not imported)
  const validIds = new Set(
    (await db.getAllAsync<{ id: string }>('SELECT id FROM items')).map(r => r.id)
  );

  for (const vc of voteCounts) {
    if (!validIds.has(vc.itemId)) continue;
    if (mode === 'merge') {
      await db.runAsync(
        `INSERT INTO vote_counts (item_id, count) VALUES (?, ?)
         ON CONFLICT(item_id) DO UPDATE SET count = count + excluded.count`,
        [vc.itemId, vc.count]
      );
    } else {
      await db.runAsync(
        'INSERT OR REPLACE INTO vote_counts (item_id, count) VALUES (?, ?)',
        [vc.itemId, vc.count]
      );
    }
  }
}
