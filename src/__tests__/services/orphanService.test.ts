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
  mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
  mockFileSystem.readDirectoryAsync.mockResolvedValue([]);
  mockFileSystem.deleteAsync.mockResolvedValue(undefined);
});

describe('orphanService', () => {
  it('returns zero counts when photos dir does not exist', async () => {
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
    const db = makeDb([]);
    const result = await cleanupOrphanPhotos(db);
    expect(result).toEqual({ scanned: 0, deleted: 0, freedBytes: 0 });
  });

  it('does not delete referenced photos', async () => {
    const db = makeDb([['abc123', 'def456']]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue(['abc123.jpg', 'def456.jpg']);
    mockFileSystem.getInfoAsync
      .mockResolvedValueOnce({ exists: true }) // dir check
      .mockResolvedValueOnce({ exists: true, size: 50000 })
      .mockResolvedValueOnce({ exists: true, size: 30000 });

    const result = await cleanupOrphanPhotos(db);
    expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });

  it('deletes unreferenced photos and returns correct stats', async () => {
    const db = makeDb([['abc123']]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue(['abc123.jpg', 'orphan999.jpg']);
    mockFileSystem.getInfoAsync
      .mockResolvedValueOnce({ exists: true })  // dir exists
      .mockResolvedValueOnce({ exists: true, size: 45000 }); // orphan file size

    const result = await cleanupOrphanPhotos(db);
    expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(1);
    expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
      expect.stringContaining('orphan999.jpg'),
      { idempotent: true }
    );
    expect(result.deleted).toBe(1);
    expect(result.freedBytes).toBe(45000);
    expect(result.scanned).toBe(2);
  });

  it('handles outfit photos as referenced too', async () => {
    const db = makeDb([], [['outfit-photo-1']]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue(['outfit-photo-1.jpg']);
    mockFileSystem.getInfoAsync
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: true, size: 20000 });

    const result = await cleanupOrphanPhotos(db);
    expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });

  it('handles empty photos directory', async () => {
    const db = makeDb([['abc123']]);
    mockFileSystem.readDirectoryAsync.mockResolvedValue([]);
    const result = await cleanupOrphanPhotos(db);
    expect(result).toEqual({ scanned: 0, deleted: 0, freedBytes: 0 });
  });
});
