import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

export interface OrphanCleanupResult {
  scanned: number;
  deleted: number;
  freedBytes: number;
}

export async function cleanupOrphanPhotos(
  db: SQLiteDatabase
): Promise<OrphanCleanupResult> {
  if (Platform.OS === 'web') return { scanned: 0, deleted: 0, freedBytes: 0 };

  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) return { scanned: 0, deleted: 0, freedBytes: 0 };

  // Collect all referenced photo paths from DB
  const itemRows = await db.getAllAsync<{ photo_ids: string }>(
    "SELECT photo_ids FROM items WHERE photo_ids != '[]'"
  );
  const outfitRows = await db.getAllAsync<{ photo_ids: string }>(
    "SELECT photo_ids FROM outfits WHERE photo_ids != '[]'"
  );

  const referencedIds = new Set<string>();
  for (const row of [...itemRows, ...outfitRows]) {
    const entries: string[] = JSON.parse(row.photo_ids || '[]');
    entries.forEach(pathOrId => {
      // Supports both formats:
      //   old: bare UUID "abc123"
      //   new: full path "file:///…/photos/abc123.jpg"
      const filename = pathOrId.split('/').pop() ?? pathOrId;
      const id = filename.replace(/\.[^.]+$/, '');
      referencedIds.add(id);
    });
  }

  // Scan files in photos/ directory
  const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
  let deleted = 0;
  let freedBytes = 0;

  for (const fileName of files) {
    // File names are "{id}.jpg" — extract ID
    const id = fileName.replace(/\.[^.]+$/, '');
    if (!referencedIds.has(id)) {
      const filePath = `${PHOTOS_DIR}${fileName}`;
      const fi = await FileSystem.getInfoAsync(filePath);
      if (fi.exists) {
        freedBytes += ('size' in fi ? (fi as { size?: number }).size : 0) ?? 0;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        deleted++;
      }
    }
  }

  return { scanned: files.length, deleted, freedBytes };
}
