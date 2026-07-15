import { Platform } from 'react-native';
import {
  photoFilenameFromPath,
  photoRelativePath,
  parseV4PhotoKey,
  mapV4ItemToV5,
  mapV4OutfitToV5,
  buildIdRemap,
  exportBackup,
} from '../../services/backupService';
import * as downloadsService from '../../services/downloadsService';
import { __mockDb } from '../../__mocks__/expo-sqlite';
import type { LegacyItem, LegacyOutfit } from '../../types';

jest.mock('../../services/downloadsService');

// expo-file-system（不帶 /legacy）在 jest-expo 底下無法透過 moduleNameMapper 正確攔截
// （會解析回真正的原生模組殼，且會連帶影響 /legacy 子路徑的解析），故在此單獨 mock，
// 並沿用共用 mock 的內容以保持 /legacy 那份 import 的行為一致。
jest.mock('expo-file-system', () => ({
  ...jest.requireActual('../../__mocks__/expo-file-system'),
  File: class MockExpoFile {
    constructor(_path: string) {}
    write(_data: Uint8Array) {}
    open() {
      return { writeBytes: (_bytes: Uint8Array) => {}, close: () => {} };
    }
  },
}));

describe('backupService — pure helpers', () => {
  // ── photoFilenameFromPath ──────────────────────────────────────

  describe('photoFilenameFromPath', () => {
    it('從完整路徑取出檔名', () => {
      expect(photoFilenameFromPath('/documents/photos/abc123.jpg')).toBe('abc123.jpg');
    });
    it('file:// 前綴路徑', () => {
      expect(photoFilenameFromPath('file:///var/mobile/Containers/photos/xyz.jpg')).toBe('xyz.jpg');
    });
    it('純檔名（無 /）保持不變', () => {
      expect(photoFilenameFromPath('abc123.jpg')).toBe('abc123.jpg');
    });
    it('空字串回傳空字串', () => {
      expect(photoFilenameFromPath('')).toBe('');
    });
  });

  // ── photoRelativePath ─────────────────────────────────────────

  describe('photoRelativePath', () => {
    it('完整路徑轉為 photos/filename', () => {
      expect(photoRelativePath('/documents/photos/abc123.jpg')).toBe('photos/abc123.jpg');
    });
    it('file:// 路徑', () => {
      expect(photoRelativePath('file:///var/mobile/photos/xyz.jpg')).toBe('photos/xyz.jpg');
    });
  });

  // ── parseV4PhotoKey ───────────────────────────────────────────

  describe('parseV4PhotoKey', () => {
    it('解析 storage:photoId 格式', () => {
      expect(parseV4PhotoKey('storage:abc123')).toBe('abc123');
    });
    it('複雜 photoId (storage:)', () => {
      expect(parseV4PhotoKey('storage:1234567890-abcdefg')).toBe('1234567890-abcdefg');
    });
    it('解析 idb:uuid 格式（實際 V4 備份格式）', () => {
      expect(parseV4PhotoKey('idb:15f8a86b-82df-4ba7-acd4-31b5331ca9ad')).toBe('15f8a86b-82df-4ba7-acd4-31b5331ca9ad');
    });
    it('idb: 前綴的 UUID', () => {
      expect(parseV4PhotoKey('idb:636c7240-e5f6-42aa-9b7b-5d69eb2d43de')).toBe('636c7240-e5f6-42aa-9b7b-5d69eb2d43de');
    });
    it('非 storage:/idb: 前綴回傳 null', () => {
      expect(parseV4PhotoKey('photos/abc.jpg')).toBeNull();
    });
    it('僅有前綴無 id 回傳 null', () => {
      expect(parseV4PhotoKey('storage:')).toBeNull();
    });
    it('idb: 僅有前綴無 id 回傳 null', () => {
      expect(parseV4PhotoKey('idb:')).toBeNull();
    });
    it('空字串回傳 null', () => {
      expect(parseV4PhotoKey('')).toBeNull();
    });
  });

  // ── buildIdRemap ─────────────────────────────────────────────
  // 這是修復「FOREIGN KEY constraint failed」的核心邏輯：
  // 合併匯入時，已存在同名的 category/origin 會被 INSERT OR IGNORE 靜默跳過，
  // 但 SQLite 的 FK 錯誤不會被 OR IGNORE 吞掉，所以必須把備份裡的 ID
  // remap 成 DB 裡真正存在的 ID（透過 name 對應）。

  describe('buildIdRemap', () => {
    it('同名分類：備份 ID 應 remap 到 DB 裡的真實 ID', () => {
      const manifestCats = [
        { id: 'cat-v4-上衣', name: '上衣' },
        { id: 'cat-v4-裙裝', name: '裙裝' },
      ];
      const nameToDbId = { '上衣': 'cat-db-001', '裙裝': 'cat-db-002' };
      const remap = buildIdRemap(manifestCats, nameToDbId);
      expect(remap['cat-v4-上衣']).toBe('cat-db-001');
      expect(remap['cat-v4-裙裝']).toBe('cat-db-002');
    });

    it('ID 已相同時不加入 remap（避免無意義覆蓋）', () => {
      const manifestCats = [{ id: 'cat-db-001', name: '上衣' }];
      const nameToDbId = { '上衣': 'cat-db-001' };
      const remap = buildIdRemap(manifestCats, nameToDbId);
      expect(remap['cat-db-001']).toBeUndefined();
    });

    it('DB 裡沒有同名分類時不加入 remap（新分類直接插入，ID 保持不變）', () => {
      const manifestCats = [{ id: 'cat-v4-外套', name: '外套' }];
      const nameToDbId = {}; // DB 沒有「外套」
      const remap = buildIdRemap(manifestCats, nameToDbId);
      expect(Object.keys(remap)).toHaveLength(0);
    });

    it('混合情況：部分需要 remap、部分不需要', () => {
      const manifestOrigins = [
        { id: 'origin-v4-日貨', name: '日貨' }, // DB 已存在
        { id: 'origin-v4-韓貨', name: '韓貨' }, // DB 已存在
        { id: 'origin-v4-精品', name: '精品' }, // DB 沒有，新的
      ];
      const nameToDbId = { '日貨': 'origin-db-1', '韓貨': 'origin-db-2' };
      const remap = buildIdRemap(manifestOrigins, nameToDbId);
      expect(remap['origin-v4-日貨']).toBe('origin-db-1');
      expect(remap['origin-v4-韓貨']).toBe('origin-db-2');
      expect(remap['origin-v4-精品']).toBeUndefined();
    });

    it('空陣列輸入回傳空 remap', () => {
      expect(buildIdRemap([], { '上衣': 'cat-1' })).toEqual({});
    });

    it('空 nameToDbId 回傳空 remap', () => {
      const cats = [{ id: 'cat-v4-上衣', name: '上衣' }];
      expect(buildIdRemap(cats, {})).toEqual({});
    });

    it('實際場景重現：V4 備份的 idb 格式 ID 被 remap 到新版 App 的 DB ID', () => {
      // 這正是讓匯入失敗的場景：
      // - 新版 App 預設已有「上衣」category，ID 為 "cat-20260101-abc"
      // - V4 備份把「上衣」轉換成 ID "cat-v4-%E4%B8%8A%E8%A1%A3"
      // - INSERT OR IGNORE 跳過（UNIQUE name 衝突）
      // - 單品的 categoryId = "cat-v4-%E4%B8%8A%E8%A1%A3" → DB 找不到 → FK 錯誤
      const manifestCats = [
        { id: 'cat-v4-%E4%B8%8A%E8%A1%A3', name: '上衣' },
      ];
      const nameToDbId = { '上衣': 'cat-20260101-abc' };
      const remap = buildIdRemap(manifestCats, nameToDbId);
      expect(remap['cat-v4-%E4%B8%8A%E8%A1%A3']).toBe('cat-20260101-abc');
    });
  });

  // ── mapV4ItemToV5 ─────────────────────────────────────────────

  describe('mapV4ItemToV5', () => {
    const catsByName = { '上衣': 'cat-001', '裙裝': 'cat-002' };
    const originsByName = { '日貨': 'origin-001' };
    const keyToRelativePath = {
      'photo-aaa': 'photos/photo-aaa.jpg',
      'photo-bbb': 'photos/photo-bbb.jpg',
    };

    const legacyItem: LegacyItem = {
      id: 'item-v4-001',
      brand: 'ZARA',
      name: '白色T恤',
      purchaseDate: '2025-03-01',
      category: '上衣',
      origin: '日貨',
      grade: 'A',
      originalPrice: 500,
      seasons: ['春季', '夏季'],
      wearCountTotal: 10,
      itemPhotos: [
        { id: 'ref-1', bundleKey: 'photo-aaa', storage: 'native' },
        { id: 'ref-2', bundleKey: 'photo-bbb', storage: 'native' },
        { id: 'ref-3', bundleKey: 'photo-missing', storage: 'native' }, // 沒有對應
      ],
      miniNote: '很好穿',
      createdAt: '2025-03-01T00:00:00.000Z',
    };

    it('正確映射基本欄位', () => {
      const result = mapV4ItemToV5(legacyItem, catsByName, originsByName, keyToRelativePath);
      expect(result.id).toBe('item-v4-001');
      expect(result.brand).toBe('ZARA');
      expect(result.name).toBe('白色T恤');
      expect(result.purchaseDate).toBe('2025-03-01');
    });

    it('正確映射分類與來源 ID', () => {
      const result = mapV4ItemToV5(legacyItem, catsByName, originsByName, keyToRelativePath);
      expect(result.categoryId).toBe('cat-001');
      expect(result.originId).toBe('origin-001');
    });

    it('正確映射 usageCount（wearCountTotal）', () => {
      const result = mapV4ItemToV5(legacyItem, catsByName, originsByName, keyToRelativePath);
      expect(result.usageCount).toBe(10);
    });

    it('只包含有對應路徑的照片（跳過 missing）', () => {
      const result = mapV4ItemToV5(legacyItem, catsByName, originsByName, keyToRelativePath);
      expect(result.photoIds).toEqual(['photos/photo-aaa.jpg', 'photos/photo-bbb.jpg']);
    });

    it('未知分類或來源設為 undefined', () => {
      const item: LegacyItem = { ...legacyItem, category: '未知分類', origin: '未知來源' };
      const result = mapV4ItemToV5(item, catsByName, originsByName, keyToRelativePath);
      expect(result.categoryId).toBeUndefined();
      expect(result.originId).toBeUndefined();
    });

    it('沒有 itemPhotos 時 photoIds 為空陣列', () => {
      const item: LegacyItem = { ...legacyItem, itemPhotos: undefined };
      const result = mapV4ItemToV5(item, catsByName, originsByName, keyToRelativePath);
      expect(result.photoIds).toEqual([]);
    });

    it('wearCountTotal 缺失時 usageCount 為 0', () => {
      const item: LegacyItem = { ...legacyItem, wearCountTotal: undefined };
      const result = mapV4ItemToV5(item, catsByName, originsByName, keyToRelativePath);
      expect(result.usageCount).toBe(0);
    });

    it('preserves seasons array', () => {
      const result = mapV4ItemToV5(legacyItem, catsByName, originsByName, keyToRelativePath);
      expect(result.seasons).toEqual(['春季', '夏季']);
    });
  });

  // ── mapV4OutfitToV5 ───────────────────────────────────────────

  describe('mapV4OutfitToV5', () => {
    const keyToRelativePath = {
      'photo-outfit-1': 'photos/outfit-1.jpg',
    };

    const legacyOutfit: LegacyOutfit = {
      id: 'outfit-v4-001',
      date: '2025-05-10',
      time: '14:00',
      weather: '晴天',
      county: '台北市',
      notes: '好天氣',
      outfitPhotos: [
        { id: 'ref-o1', bundleKey: 'photo-outfit-1', storage: 'native' },
        { id: 'ref-o2', bundleKey: 'photo-no-match', storage: 'native' },
      ],
      wornItemIds: ['item-001', 'item-002'],
      createdAt: '2025-05-10T00:00:00.000Z',
    };

    it('正確映射基本欄位', () => {
      const result = mapV4OutfitToV5(legacyOutfit, keyToRelativePath);
      expect(result.id).toBe('outfit-v4-001');
      expect(result.date).toBe('2025-05-10');
      expect(result.time).toBe('14:00');
      expect(result.weather).toBe('晴天');
      expect(result.county).toBe('台北市');
    });

    it('notes → note 欄位名稱對應', () => {
      const result = mapV4OutfitToV5(legacyOutfit, keyToRelativePath);
      expect(result.note).toBe('好天氣');
    });

    it('wornItemIds → itemIds', () => {
      const result = mapV4OutfitToV5(legacyOutfit, keyToRelativePath);
      expect(result.itemIds).toEqual(['item-001', 'item-002']);
    });

    it('只保留有對應路徑的照片', () => {
      const result = mapV4OutfitToV5(legacyOutfit, keyToRelativePath);
      expect(result.photoIds).toEqual(['photos/outfit-1.jpg']);
    });

    it('沒有 wornItemIds 時 itemIds 為空陣列', () => {
      const outfit: LegacyOutfit = { ...legacyOutfit, wornItemIds: undefined };
      const result = mapV4OutfitToV5(outfit, keyToRelativePath);
      expect(result.itemIds).toEqual([]);
    });

    it('沒有 date 時使用 createdAt 的日期部分', () => {
      const outfit: LegacyOutfit = { ...legacyOutfit, date: undefined };
      const result = mapV4OutfitToV5(outfit, keyToRelativePath);
      expect(result.date).toBe('2025-05-10');
    });
  });
});

describe('exportBackup — 儲存至手機時每次詢問資料夾', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    (Platform as { OS: string }).OS = 'android';
    jest.mocked(downloadsService.getLastBackupDirectoryUri).mockResolvedValue(null);
    jest.mocked(downloadsService.setLastBackupDirectoryUri).mockResolvedValue(undefined);
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
    jest.clearAllMocks();
  });

  it('使用者取消資料夾選擇時回傳 cancelled，且不呼叫寫入', async () => {
    jest.mocked(downloadsService.pickBackupFolder).mockResolvedValue(null);

    const result = await exportBackup(__mockDb, true);

    expect(result).toEqual({ status: 'cancelled' });
    expect(downloadsService.saveFileToTreeUri).not.toHaveBeenCalled();
    expect(downloadsService.setLastBackupDirectoryUri).not.toHaveBeenCalled();
  });

  it('使用者選好資料夾後寫入該位置，並回傳可讀的儲存位置', async () => {
    jest.mocked(downloadsService.pickBackupFolder).mockResolvedValue({
      directoryUri: 'content://com.android.externalstorage.documents/tree/primary%3ADownload',
      label: '內部儲存空間/Download',
    });
    jest.mocked(downloadsService.saveFileToTreeUri).mockResolvedValue('content://saved-file-uri');

    const result = await exportBackup(__mockDb, true);

    expect(result).toEqual({ status: 'done', savedTo: '內部儲存空間/Download' });
    expect(downloadsService.saveFileToTreeUri).toHaveBeenCalledWith(
      expect.any(String),
      'content://com.android.externalstorage.documents/tree/primary%3ADownload',
      expect.any(String)
    );
    expect(downloadsService.setLastBackupDirectoryUri).toHaveBeenCalledWith(
      'content://com.android.externalstorage.documents/tree/primary%3ADownload'
    );
  });

  it('每次都會呼叫資料夾選擇（帶入上次選擇的位置作為初始值），不會略過詢問', async () => {
    jest.mocked(downloadsService.getLastBackupDirectoryUri).mockResolvedValue('content://last-dir');
    jest.mocked(downloadsService.pickBackupFolder).mockResolvedValue({
      directoryUri: 'content://last-dir',
      label: '內部儲存空間/Backup',
    });
    jest.mocked(downloadsService.saveFileToTreeUri).mockResolvedValue('content://saved-file-uri');

    await exportBackup(__mockDb, true);

    expect(downloadsService.pickBackupFolder).toHaveBeenCalledWith('content://last-dir');
  });
});
