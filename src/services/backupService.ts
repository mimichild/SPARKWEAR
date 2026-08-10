import { Platform } from 'react-native';
import { Zip, ZipPassThrough, strToU8, Unzip, UnzipInflate, strFromU8 } from 'fflate';
import { File as ExpoFile } from 'expo-file-system';
import {
  pickBackupFolder, saveFileToTreeUri,
  getLastBackupDirectoryUri, setLastBackupDirectoryUri,
} from './downloadsService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getItems } from './itemService';
import { getOutfits } from './outfitService';
import { getCategories, getOrigins, getColors } from './categoryService';
import { getAllVoteCounts } from './itemService';
import { getAllUsageLogs } from './usageLogService';
import { ensurePhotosDirExists } from './photoService';
import type {
  Item, Outfit, Category, Origin, Color, VoteCount, UsageLog,
  BackupManifest, BackupPhotoEntry,
  LegacyManifest, LegacyItem, LegacyOutfit,
  ImportMode, ImportResult, ExportResult,
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
    colorIds: legacy.colorId ? [legacy.colorId] : [],
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
  saveToDevice: boolean,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<ExportResult> {
  if (Platform.OS === 'web') throw new Error('Export is not supported on web');

  onProgress?.('reading', 0, 1);
  const items         = await getItems(db);
  const outfits       = await getOutfits(db);
  const categories    = await getCategories(db);
  const origins       = await getOrigins(db);
  const colors        = await getColors(db);
  const voteCountsMap = await getAllVoteCounts(db);
  const usageLogs     = await getAllUsageLogs(db);

  // Collect unique photo paths
  const allPaths = new Set<string>();
  items.forEach(i => i.photoIds.forEach(p => allPaths.add(p)));
  outfits.forEach(o => o.photoIds.forEach(p => allPaths.add(p)));
  const pathsArr = Array.from(allPaths);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFilename = `sparkwear_${timestamp}.zip`;
  const zipPath = `${FileSystem.cacheDirectory}${zipFilename}`;

  // ── 串流建立 ZIP（fflate Zip + FileHandle）────────────────────
  // 一次只處理一張照片，ZIP 資料邊產生邊寫入磁碟，不累積於記憶體
  const zipFile = new ExpoFile(zipPath);
  zipFile.write(new Uint8Array(0)); // 建立空檔案
  const handle = zipFile.open();

  let zipError: Error | null = null;
  const fzip = new Zip((err, data, _final) => {
    if (err) { zipError = err instanceof Error ? err : new Error(String(err)); return; }
    if (data.length > 0) handle.writeBytes(data);
  });

  const pathToRelative: Record<string, string> = {};
  const mediaPhotos: BackupPhotoEntry[] = [];
  let packed = 0;

  for (const path of pathsArr) {
    if (zipError) break;
    const photoFilename = photoFilenameFromPath(path);
    const fileUri = path.startsWith('file://') ? path : `file://${path}`;
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        const b64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // base64 → Uint8Array（每次只佔一張照片的記憶體，處理完即釋放）
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        // 不壓縮（JPEG 已壓縮），直接存入 ZIP → 立即寫入磁碟
        const entry = new ZipPassThrough(`photos/${photoFilename}`);
        fzip.add(entry);
        entry.push(bytes, true);

        const rel = `photos/${photoFilename}`;
        pathToRelative[path] = rel;
        mediaPhotos.push({
          id: photoFilename.replace(/\.[^.]+$/, ''),
          profile: 'detail',
          mimeType: 'image/jpeg',
          file: rel,
        });
      }
    } catch {
      // skip unreadable files
    }
    packed++;
    onProgress?.('packing', packed, pathsArr.length);
  }

  if (zipError) { handle.close(); throw zipError; }

  // Build manifest using the relative path map
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
      items: exportItems, outfits: exportOutfits,
      categories, origins, colors, voteCounts, usageLogs, settings: {},
    },
    media: { photos: mediaPhotos },
  };

  // Add manifest.json
  const manifestEntry = new ZipPassThrough('manifest.json');
  fzip.add(manifestEntry);
  manifestEntry.push(strToU8(JSON.stringify(manifest)), true);

  // Finalize ZIP (writes central directory to disk)
  fzip.end();
  handle.close();

  if (zipError) throw zipError;

  onProgress?.('saving', 0, 1);

  if (saveToDevice && Platform.OS === 'android') {
    // 每次都詢問使用者要存到哪個資料夾（帶入上次選擇的位置作為初始值）
    const lastDir = await getLastBackupDirectoryUri();
    const picked = await pickBackupFolder(lastDir);
    if (!picked) {
      await FileSystem.deleteAsync(zipPath, { idempotent: true });
      return { status: 'cancelled' };
    }

    await saveFileToTreeUri(zipPath, picked.directoryUri, zipFilename);
    await setLastBackupDirectoryUri(picked.directoryUri);
    onProgress?.('done', 1, 1);
    return { status: 'done', savedTo: picked.label };
  }

  // iOS 或 Android 分享模式
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(zipPath, {
      mimeType: 'application/zip',
      dialogTitle: 'SPARKWEAR 備份',
    });
  }

  onProgress?.('done', 1, 1);
  return { status: 'done' };
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

  let uri = picked.assets[0].uri;

  // streamExtractZip 的分塊讀取（position/length）只對 file:// 有效。
  // 若 DocumentPicker 仍回傳 content:// URI（大檔案 copyToCacheDirectory 失敗時），
  // 先手動 copy 到 cache 再讀取。
  if (!uri.startsWith('file://') && !uri.startsWith('/')) {
    // 顯示「複製中」讓使用者知道 30 秒等待是正常的
    onProgress?.('copying', 0, 1);
    const localPath = `${FileSystem.cacheDirectory}sparkwear_import_${Date.now()}.zip`;
    await FileSystem.copyAsync({ from: uri, to: localPath });
    uri = localPath;
  }

  return importBackupFromUri(db, uri, mode, onProgress);
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
    await db.runAsync('DELETE FROM item_usage_logs');
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
  // 舊版備份檔（本次修復前匯出）沒有 usageLogs 欄位，?? [] 保底避免炸掉
  await insertUsageLogs(db, manifest.data.usageLogs ?? []);

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
  let totalPhotosEncountered = 0; // 每發現一張照片就 +1，作為進度分母
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
      totalPhotosEncountered++; // 發現照片時立刻計入分母

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
            // ZIP 讀完後 totalPhotosEncountered 才穩定，才開始報告進度
            // 讀取期間不呼叫，避免分母是中間值（如 765 而非最終 2455）
            if (streamDone) {
              onProgress?.('importing', savedPhotoCount, totalPhotosEncountered);
            }
            tryResolve();
          }).catch(() => {
            missingPhotoCount++;
            pendingWrites--;
            if (streamDone) {
              onProgress?.('importing', savedPhotoCount, totalPhotosEncountered);
            }
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
  // ZIP 讀完，totalPhotosEncountered 現在穩定，發出初始進度讓 UI 切換
  if (totalPhotosEncountered > 0) {
    onProgress?.('importing', savedPhotoCount, totalPhotosEncountered);
  }
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
      usageLogs: [], // v4 沒有 item_usage_logs 這個概念，轉換時沒有資料可帶
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
    if (mode === 'merge' && existing.has(item.id)) {
      // 合併模式：保留現有單品的其他資料，但以備份值還原 usage_count
      // （修復之前 bug 造成的數值膨脹）
      await db.runAsync(
        'UPDATE items SET usage_count = ? WHERE id = ?',
        [item.usageCount, item.id]
      );
      continue;
    }
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
    if (mode === 'merge' && existing.has(outfit.id)) {
      // 已存在時只補回遺失的 note（不覆蓋使用者已編輯的內容）
      if (outfit.note) {
        await db.runAsync(
          'UPDATE outfits SET note = ? WHERE id = ? AND (note IS NULL OR note = "")',
          [outfit.note, outfit.id]
        );
      }
      continue;
    }
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

async function insertUsageLogs(
  db: SQLiteDatabase,
  usageLogs: UsageLog[]
): Promise<void> {
  if (usageLogs.length === 0) return;

  // 跳過參照到沒被匯入的單品的 log（避免留下孤兒紀錄）；不分合併/覆蓋模式，
  // 兩者都用 INSERT OR IGNORE by id——同一份備份重複匯入時天然不會產生重複筆數，
  // 跟 insertOutfits/insertItems 用同一套「以 id 判斷是否已存在」的邏輯一致
  const validIds = new Set(
    (await db.getAllAsync<{ id: string }>('SELECT id FROM items')).map(r => r.id)
  );

  for (const log of usageLogs) {
    if (!validIds.has(log.itemId)) continue;
    await db.runAsync(
      'INSERT OR IGNORE INTO item_usage_logs (id, item_id, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
      [log.id, log.itemId, log.loggedAt, log.source, log.createdAt]
    );
  }
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
    // merge 與 overwrite 都用 INSERT OR REPLACE：
    // 備份裡有的項目 → 以備份正確值覆蓋（修復舊版疊加造成的膨脹）
    // 備份裡沒有的項目 → 不觸碰（DB 裡的值保留）
    await db.runAsync(
      'INSERT OR REPLACE INTO vote_counts (item_id, count) VALUES (?, ?)',
      [vc.itemId, vc.count]
    );
  }
}
