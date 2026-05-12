/**
 * Regression tests for orphan cleanup compatibility
 *
 * Bug: orphanService only handled bare UUIDs in photo_ids.
 * After fix: supports both bare IDs ("abc123") and full paths ("file:///…/abc123.jpg")
 */
import { cleanupOrphanPhotos } from '../../services/orphanService';

const mockFileSystem = require('expo-file-system');

function makeDb(itemPhotoIds: string[][], outfitPhotoIds: string[][] = []) {
  return {
    getAllAsync: jest.fn()
      .mockResolvedValueOnce(itemPhotoIds.map(ids => ({ photo_ids: JSON.stringify(ids) })))
      .mockResolvedValueOnce(outfitPhotoIds.map(ids => ({ photo_ids: JSON.stringify(ids) }))),
  } as unknown as import('expo-sqlite').SQLiteDatabase;
}

beforeEach(() => {
  jest.resetAllMocks();
  mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true });
  mockFileSystem.readDirectoryAsync.mockResolvedValue([]);
  mockFileSystem.deleteAsync.mockResolvedValue(undefined);
});

describe('orphanService — path format regression', () => {
  it('does NOT delete a file when photo_ids stores full file:// paths', async () => {
    // New format: photo_ids = ["file:///data/.../photos/abc123.jpg"]
    const db = makeDb([['file:///data/user/0/com.sparkwear/files/photos/abc123.jpg']]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue(['abc123.jpg']);
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true });

    const result = await cleanupOrphanPhotos(db);

    expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });

  it('does NOT delete a file when photo_ids stores bare UUIDs (old format)', async () => {
    // Old format: photo_ids = ["abc123"]
    const db = makeDb([['abc123']]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue(['abc123.jpg']);
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true });

    const result = await cleanupOrphanPhotos(db);

    expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });

  it('deletes file that is not referenced by either old or new format', async () => {
    // item has abc123, but orphan999 is on disk and not referenced
    const db = makeDb([['file:///data/.../photos/abc123.jpg']]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue(['abc123.jpg', 'orphan999.jpg']);
    mockFileSystem.getInfoAsync
      .mockResolvedValueOnce({ exists: true })   // dir check
      .mockResolvedValueOnce({ exists: true, size: 40000 }); // orphan999.jpg

    const result = await cleanupOrphanPhotos(db);

    expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(1);
    expect(result.deleted).toBe(1);
    expect(result.freedBytes).toBe(40000);
  });

  it('handles mixed old/new format in same item list', async () => {
    // item1 uses old format (bare ID), item2 uses new format (full path)
    const db = makeDb([
      ['oldformat123'],
      ['file:///data/.../photos/newformat456.jpg'],
    ]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue([
      'oldformat123.jpg', 'newformat456.jpg',
    ]);

    const result = await cleanupOrphanPhotos(db);

    expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });
});
