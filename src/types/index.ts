export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';
export type Season = '春季' | '夏季' | '秋季' | '冬季';
export type RankingMetric = 'usage' | 'price_asc' | 'price_desc' | 'cp';
export type RankingPeriod = 'month' | 'quarter' | 'year' | 'rolling' | 'all';
export type SortOrder = 'asc' | 'desc';
export type ImportMode = 'merge' | 'replace';
export type PhotoProfile = 'thumb' | 'grid' | 'detail' | 'backup-lite';

export interface Photo {
  id: string;
  path: string;
  thumbPath?: string;
  gridPath?: string;
  detailPath?: string;
  mimeType: string;
  fileSize?: number;
  width?: number;
  height?: number;
  profile?: PhotoProfile;
  createdAt: string;
}

export interface Item {
  id: string;
  brand?: string;
  name: string;
  purchaseDate?: string;
  purchaseTime?: string;
  categoryId?: string;
  originId?: string;
  colorIds: string[];
  grade?: Grade;
  originalPrice?: number;
  specialPrice?: number;
  discountPrice?: number;
  size?: string;
  weight?: string;
  bodyType?: string;
  suggestedWeight?: string;
  usageCount: number;
  seasons: Season[];
  miniNote?: string;
  pros?: string;
  cons?: string;
  remark?: string;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Outfit {
  id: string;
  date: string;
  time?: string;
  weather?: string;
  temperature?: string;
  county?: string;
  place?: string;
  note?: string;
  photoIds: string[];
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Origin {
  id: string;
  name: string;
  isDefault: boolean;
  deleted: boolean;
  createdAt: string;
}

export interface Color {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface VoteCount {
  itemId: string;
  count: number;
}

export interface AppSettings {
  themeColor: string;
  fontKey: string;
  isProUnlocked: boolean;
  tabOrder: string[];
  enabledTabs: string[];
  purchaseSort: SortOrder;
  photoSort: SortOrder;
  outfitSort: SortOrder;
  rankingPeriod: RankingPeriod;
  lastCleanupAt?: string;
}

export interface RankingItem extends Item {
  totalUsage: number;
  effectivePrice?: number;
  cpValue?: number;
}

// ── Backup / Import types ──────────────────────────────────

export interface BackupManifest {
  app: 'SPARKWEAR';
  version: 5;
  exportedAt: string;
  data: {
    items: Item[];
    outfits: Outfit[];
    categories: Category[];
    origins: Origin[];
    colors: Color[];
    voteCounts: VoteCount[];
    settings: Partial<AppSettings>;
  };
  media: {
    photos: BackupPhotoEntry[];
  };
}

export interface BackupPhotoEntry {
  id: string;
  profile: PhotoProfile;
  mimeType: string;
  file: string; // 'photos/00001-name.jpg'
}

// Legacy v4 format (Capacitor app backup)
export interface LegacyManifest {
  app: 'SPARK WEAR';
  version: 4;
  exportedAt: string;
  data: {
    items: LegacyItem[];
    dailyLogs: LegacyOutfit[];
    manualVoteCounts: Record<string, number>;
    categoryOrder: string[];
    categoryColors: Record<string, string>;
    customOrigins: string[];
    deletedOrigins: string[];
    refColors?: { id: string; name: string }[];
  };
  media: {
    photos: LegacyPhotoEntry[];
  };
}

export interface LegacyPhotoEntry {
  key: string; // "storage:photoId"
  profile: string;
  mimeType: string;
  file: string;
}

export interface LegacyItem {
  id: string;
  brand?: string;
  name: string;
  purchaseDate?: string;
  category?: string;
  colorId?: string;
  colors?: unknown[];
  originalPrice?: number;
  specialPrice?: number;
  discountPrice?: number;
  size?: string;
  weight?: string;
  bodyType?: string;
  suggestedWeight?: string;
  grade?: string;
  origin?: string;
  seasons?: string[];
  miniNote?: string;
  pros?: string;
  cons?: string;
  remark?: string;
  itemPhotos?: LegacyPhotoRef[];
  wearCountTotal?: number;
  createdAt?: string;
}

export interface LegacyPhotoRef {
  id: string;
  path?: string;
  storage: 'idb' | 'native' | 'legacy-inline' | 'missing';
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  createdAt?: string;
  profile?: string;
  webSrc?: string;
  bundleKey?: string;
  inlineDataUrl?: string;
}

export interface LegacyOutfit {
  id: string;
  date?: string;
  time?: string;
  weather?: string;
  temperature?: string;
  county?: string;
  place?: string;
  notes?: string;
  outfitPhotos?: LegacyPhotoRef[];
  wornItemIds?: string[];
  createdAt?: string;
}

export interface ImportResult {
  success: boolean;
  itemCount: number;
  outfitCount: number;
  photoCount: number;
  missingPhotoCount: number;
  error?: string;
}
