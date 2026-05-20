# SPARKWEAR React Native 重建計畫

> 工作目錄：`/Users/mimi/Documents/SPARKWEAR/`
> 舊版參考：`/Users/mimi/Documents/SPARKWEAR-old/`
> 最後更新：2026-05-12

---

## 技術選型

```
核心框架：      React Native 0.81.5 (New Architecture)
開發工具：      Expo SDK 54 + EAS Build
路由：          Expo Router v6 (file-based)
語言：          TypeScript (strict)
資料庫：        expo-sqlite v16 (useSQLiteContext hook)
設定儲存：      @react-native-async-storage/async-storage
狀態管理：      Zustand v5
圖片選取：      expo-image-picker
圖片處理：      expo-image-manipulator (壓縮/裁切)
檔案系統：      expo-file-system
手勢：          react-native-gesture-handler + react-native-reanimated
列表：          @shopify/flash-list
ZIP 處理：      jszip
匯出：          expo-sharing
匯入：          expo-document-picker
App Bundle ID： com.sparkwear.app
```

---

## 專案檔案結構

```
/Users/mimi/Documents/SPARKWEAR/
├── app/
│   ├── _layout.tsx                  # Root layout (DB Provider, Theme, GestureHandler)
│   ├── index.tsx                    # 首頁（版本號、導航按鈕）
│   ├── closet/
│   │   ├── _layout.tsx              # Stack layout（管理 item/category 子頁）
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx          # Tabs layout（單品/照片/分類/排行）
│   │   │   ├── index.tsx            # 單品列表 tab
│   │   │   ├── photos.tsx           # 照片牆 tab
│   │   │   ├── category.tsx         # 分類瀏覽 tab
│   │   │   └── ranking.tsx          # 排行 tab
│   │   ├── item/
│   │   │   ├── [id].tsx             # 單品詳情
│   │   │   └── form.tsx             # 新增/編輯單品（modal）
│   │   └── category/
│   │       └── [name].tsx           # 分類詳情頁
│   ├── outfits/
│   │   ├── index.tsx                # 穿搭 Grid
│   │   ├── [id].tsx                 # 穿搭詳情
│   │   └── form.tsx                 # 新增/編輯穿搭
│   └── settings/
│       └── index.tsx                # 設定頁（modal）
├── src/
│   ├── db/
│   │   ├── schema.ts                # SQLite CREATE TABLE SQL + 常數
│   │   └── index.ts                 # initDatabase() + SQLiteProvider re-export
│   ├── stores/
│   │   ├── settingsStore.ts         # Zustand：主題色/字體/Pro解鎖/排序設定
│   │   └── uiStore.ts               # Zustand：搜尋關鍵字/選取模式
│   ├── services/
│   │   ├── itemService.ts           # 單品 CRUD
│   │   ├── outfitService.ts         # 穿搭 CRUD
│   │   ├── categoryService.ts       # 分類/來源/顏色 CRUD
│   │   ├── photoService.ts          # 選圖/壓縮/存檔/刪除
│   │   ├── backupService.ts         # ZIP 匯出/匯入（含舊版相容）
│   │   └── orphanService.ts         # 孤兒圖片清理
│   ├── hooks/
│   │   ├── useItems.ts
│   │   ├── useOutfits.ts
│   │   ├── useRanking.ts            # 使用次數/購買金額/C/P值排行計算
│   │   └── useTheme.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── ThemedText.tsx
│   │   │   ├── ThemedView.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── ProgressOverlay.tsx
│   │   ├── items/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemForm.tsx
│   │   │   ├── PhotoCropModal.tsx
│   │   │   └── BulkActionBar.tsx
│   │   ├── outfits/
│   │   │   ├── OutfitCard.tsx
│   │   │   └── OutfitForm.tsx
│   │   └── shared/
│   │       ├── PhotoWall.tsx        # FlashList 照片牆
│   │       ├── SearchBar.tsx
│   │       ├── ChipRow.tsx
│   │       └── Carousel.tsx
│   ├── constants/
│   │   ├── defaults.ts              # 預設分類(13)/顏色(15)/來源(5)/Tab順序
│   │   ├── compression.ts           # 壓縮 profile 常數
│   │   └── theme.ts                 # 12 個預設主題色 + 字體清單
│   ├── types/
│   │   └── index.ts                 # 所有 TypeScript 型別（含舊版備份格式）
│   ├── __mocks__/                   # Jest 測試 mock
│   └── __tests__/                   # Jest 單元測試
├── e2e/
│   └── visual.sh                    # agent-browser 視覺回歸測試
├── scripts/
│   └── regression.sh                # 完整回歸測試（typecheck + jest + visual）
├── docs/
│   └── REQUIREMENTS.md              # 本檔案
├── app.json
├── tsconfig.json
└── package.json
```

---

## 資料庫 Schema（expo-sqlite）

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,           -- expo-file-system 路徑
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
  color_ids TEXT NOT NULL DEFAULT '[]',     -- JSON array of color id strings
  grade TEXT CHECK(grade IN ('A','B','C','D','E') OR grade IS NULL),
  original_price REAL,
  special_price REAL,
  discount_price REAL,
  size TEXT,
  weight TEXT,
  body_type TEXT,
  suggested_weight TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  seasons TEXT NOT NULL DEFAULT '[]',       -- JSON array: ["春季","夏季",...]
  mini_note TEXT,
  pros TEXT,
  cons TEXT,
  remark TEXT,
  photo_ids TEXT NOT NULL DEFAULT '[]',     -- JSON array, [0] = 首圖
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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
```

---

## TypeScript 資料模型

```typescript
// src/types/index.ts

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
  purchaseDate?: string;       // YYYY-MM-DD
  purchaseTime?: string;       // HH:mm
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
  usageCount: number;          // 預設 0
  seasons: Season[];
  miniNote?: string;
  pros?: string;
  cons?: string;
  remark?: string;
  photoIds: string[];          // [0] = 首圖
  createdAt: string;
  updatedAt: string;
}

export interface Outfit {
  id: string;
  date: string;                // YYYY-MM-DD（必填）
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
  color: string;               // HEX
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
```

---

## 壓縮 Profile 常數

```typescript
// src/constants/compression.ts
export const COMPRESSION_PROFILES = {
  thumb:         { width: 320,  height: 427,  quality: 0.66 },
  grid:          { width: 720,  height: 960,  quality: 0.76 },
  detail:        { width: 1080, height: 1440, quality: 0.82 },
  'backup-lite': { maxLongEdge: 1600,         quality: 0.86 },
};
```

---

## 預設值常數

```typescript
// src/constants/defaults.ts
DEFAULT_CATEGORIES = 13 個（上衣/裙裝/褲裝/洋裝/外套/套裝/日常/鞋類/包包/猶豫/留校/冷凍/未分類）
DEFAULT_ORIGINS    = 5 個（日貨/韓貨/品牌/蝦皮/其他）
DEFAULT_COLORS     = 15 個（黑/白/灰/紅/杏/卡其/咖啡/綠/粉/紫/黃/藍/格紋/條紋/點點）
DEFAULT_TAB_ORDER  = ['items', 'photos', 'category', 'ranking']
VIP_CODE           = 'MIMILOVEYOU520'
PHOTO_MAX_FREE     = 5
PHOTO_MAX_PRO      = 20
APP_VERSION        = '2.0.0'
```

---

## 功能需求（FR）

### FR-01：我的衣櫃 — 單品管理

| # | 功能 | 說明 |
|---|------|------|
| FR-01-1 | 新增單品 | 填寫所有欄位後儲存 |
| FR-01-2 | 編輯單品 | 預填既有資料，可修改全部欄位 |
| FR-01-3 | 刪除單品 | 二次確認，同步清除關聯照片檔案 |
| FR-01-4 | 單品詳情 | 照片輪播 + 所有欄位 + 曾搭配穿搭 |
| FR-01-5 | 批次分類 | 長按進入選取模式，批次變更分類 |
| FR-01-6 | 批次刪除 | 長按選取，批次刪除 + 二次確認 |
| FR-01-7 | 關鍵字搜尋 | 搜尋品牌/名稱/介紹/分類/標籤 |
| FR-01-8 | 排序 | 新→舊 / 舊→新（依購買日期） |

**單品欄位：**
品牌(選填)、名稱(必填)、購買日期(必填)、購買時間、分類、原價/特價/優惠價、
尺寸、體重、身材、建議體重範圍、分級(A-E)、來源、顏色、使用次數(預設0)、
季節(多選)、小紀錄、優點、缺點、備註、商品照片(基礎5張/Pro 20張)

### FR-02：我的衣櫃 — Tab 視圖（4 個 Tab）

| Tab | 功能 |
|-----|------|
| 單品 | FlashList 清單，首圖+品牌+名稱+分類+日期 |
| 照片 | 所有單品首圖照片牆（Grid） |
| 分類 | 色標 chip 列表，點擊進入分類詳情（單品+照片） |
| 排行 | 3 種排行維度 + 時間區間選擇 |

**Tab 功能：** 順序可在設定中拖曳調整，可啟用/停用

### FR-03：穿搭紀錄

欄位：日期(必填)、時間、天氣、氣溫、縣市、地點、穿搭想法、照片(1-20張)、搭配單品(多選)

功能：新增/編輯/刪除/詳情/批次刪除(長按)/搜尋(品牌/名稱/天氣/位置/縣市/氣溫)/排序

### FR-04：分類管理

新增分類（名稱+色標）、刪除分類（已有單品改「未分類」）、13 個預設分類

### FR-05：來源管理

新增來源（同步新增標籤）、刪除來源（同步移除標籤，已用單品改「未設定」）、5 個預設

### FR-06：顏色管理

新增/刪除顏色（已使用單品改「未選擇」）、15 個預設色

### FR-07：排行功能（3 種維度）

1. **使用次數** desc（含 vote_counts 加分）
2. **購買金額** asc/desc
3. **C/P 值** asc = `(discountPrice ?? specialPrice ?? originalPrice) ÷ usageCount`（越低越划算）

時間區間：當月 / 當季 / 當年 / 年度(滾動12個月) / 累積

### FR-08：票選衣服

搜尋 + 多選 → 確認 → 對應 vote_counts +1 → 反映在排行

### FR-09：圖片系統

| 需求 | 實作方式 |
|------|---------|
| 選取照片 | expo-image-picker（原生 picker） |
| 互動裁切 | pinch-to-zoom + drag（批次多張） |
| 壓縮存檔 | expo-image-manipulator（4 種 profile） |
| EXIF 方向修正 | manipulator rotate 處理 |
| 懶加載 | expo-image + FlashList |
| 孤兒清理 | 刪除後掃描 photos/ 目錄 |
| 遺失照片 | 顯示 MISSING placeholder，不 crash |

### FR-10：匯出 / 匯入

| # | 需求 |
|---|------|
| FR-10-1 | 匯出 ZIP（manifest.json v5 + photos/） |
| FR-10-2 | 匯入 ZIP：合併模式 |
| FR-10-3 | 匯入 ZIP：覆蓋模式 |
| FR-10-4 | 相容舊版（Capacitor app）manifest v4 格式 |
| FR-10-5 | 匯入進度顯示 |
| FR-10-6 | 遺失圖片統計提示（不 crash） |

### FR-11：設定

主題色（12預設+自訂）、字體（50種，Pro功能）、Tab 順序拖曳、功能啟用/停用、儲存空間統計、孤兒清理入口

### FR-12：Pro 解鎖

VIP Code 兌換（`MIMILOVEYOU520`）、解鎖項目：20張照片上限 + 字體切換、AsyncStorage 持久化

IAP（Google Play / Apple）之後再規劃，現版本用 VIP code。

### FR-13：UX / 系統

狀態列顏色跟隨主題色、offline-first（無需網路）、Android back / iOS swipe back、長按選取模式、上傳進度條、版本號顯示首頁

---

## 舊版備份 ZIP 相容格式（manifest v4）

```
// 匯入時需偵測 version === 4 並做欄位對應
oldVersion.data.items[]        → items[]
  .brand                       → brand
  .name                        → name
  .itemPhotos[]                → photos[]（從 media.photos 依 bundleKey 還原）
  .wearCountTotal              → usage_count（同時寫入 vote_counts）
  .category                    → categoryId（查 categories 表）
  .origin                      → originId
oldVersion.data.dailyLogs[]    → outfits[]
  .outfitPhotos[]              → photoIds
  .wornItemIds                 → item_ids
  .notes                       → note
manifest.media.photos[].file   → photos/ 目錄下的 base64 檔案
manifest.media.photos[].key    → "storage:photoId" 格式
```

---

## 驗收條件（AC）

| # | 條件 |
|---|------|
| AC-01 | DB 不含 `data:image/...` 大型字串 |
| AC-02 | 連續新增 300 張照片無儲存錯誤 |
| AC-03 | Android + iOS 完整 CRUD 流程 |
| AC-04 | 舊版備份 ZIP 匯入後照片正常顯示 |
| AC-05 | 冷啟動後資料與照片一致 |
| AC-06 | 刪除後對應照片檔案被清除 |
| AC-07 | 100 張照片牆首次渲染 < 2 秒（中階裝置） |
| AC-08 | 飛航模式下完整功能可用 |
| AC-09 | 單次上傳 20 張不 crash |
| AC-10 | Android 匯出 → iOS 匯入（反之亦然）照片正常 |

---

## 分階段開發計畫

| Phase | 內容 | 關鍵檔案 | 驗收 |
|-------|------|---------|------|
| **0** ✅ | 專案初始化、DB schema、常數、骨架路由、測試架構 | `src/db/`, `src/types/`, `src/constants/`, `scripts/` | `npm run regression` 全通過 |
| **1** ✅ | 衣櫃核心：單品 CRUD + 照片系統 + 分類/來源/顏色管理 | `src/services/itemService.ts`, `src/services/photoService.ts`, `app/closet/item/` | 可新增含照片單品、重啟資料在 |
| **2** ✅ | 穿搭紀錄：CRUD + 關聯單品 | `src/services/outfitService.ts`, `app/outfits/` | 可新增穿搭並關聯單品 |
| **3** ✅ | 進階瀏覽：照片牆 + 分類詳情 + 排行(含C/P值) + 票選 | `app/closet/(tabs)/photos.tsx`, `ranking.tsx`, `src/hooks/useRanking.ts` | 照片牆效能達標，C/P值計算正確 |
| **4** ✅ | 設定 & Pro：主題色/字體/Tab拖曳/VIP解鎖 | `app/settings/index.tsx`, `src/stores/settingsStore.ts` | 主題色重啟持續，Pro解鎖字體可選 |
| **5** ✅ | 匯出/匯入：ZIP + 舊版相容 | `src/services/backupService.ts` | AC-04, AC-10 通過 |
| **6** ✅ | iOS 驗證：跨平台測試 + 壓縮抽樣 | — | AC-03 通過 |
| **7** ✅ | 打包發布：EAS Build + icon + splash | `app.json`, `eas.json` | APK/IPA 可安裝 |

---

## 測試架構

```bash
npm run regression            # 完整回歸（TypeScript + Jest + 視覺）
npm test                      # 只跑 Jest（86 個單元測試）
npm run typecheck             # 只跑 TypeScript
bash scripts/regression.sh --skip-visual  # 跳過視覺測試
```

**回歸測試三層：**
1. `tsc --noEmit` — 型別安全
2. `jest` — 單元測試（constants/stores/db schema）
3. `expo export --platform web` + `agent-browser` — 視覺回歸截圖
