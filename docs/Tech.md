# SPARKWEAR 技術規格

> 本文件記錄 SPARKWEAR APP 的技術選型、架構設計與開發規範，供開發新 APP 時參考。

---

## 語言與核心框架

| 項目 | 版本 | 說明 |
|------|------|------|
| TypeScript | ~5.9.2 | strict 模式，所有程式碼須有型別 |
| React | 19.1.0 | 函數式元件 + Hooks |
| React Native | 0.81.5 | 跨平台 iOS / Android / Web |
| Expo SDK | ~54.0.33 | newArchEnabled: true（新架構） |
| Expo Router | ~6.0.23 | 檔案式路由（類 Next.js） |

---

## 主要套件

### UI / 畫面

| 套件 | 版本 | 用途 |
|------|------|------|
| `react-native-safe-area-context` | ~5.6.0 | Safe area / Dynamic Island 處理 |
| `react-native-screens` | ~4.16.0 | 原生 Screen 容器 |
| `react-native-gesture-handler` | ~2.28.0 | 手勢支援 |
| `react-native-reanimated` | ~4.1.1 | 動畫 |
| `@shopify/flash-list` | 2.0.2 | 高效能長列表（取代 FlatList） |
| `react-native-view-shot` | ^5.1.0 | 截圖 / 分享穿搭圖 |

### 資料 / 狀態

| 套件 | 版本 | 用途 |
|------|------|------|
| `expo-sqlite` | ~16.0.10 | 本機 SQLite 資料庫 |
| `zustand` | ^5.0.13 | 全域輕量狀態管理 |
| `@react-native-async-storage/async-storage` | 2.2.0 | 設定持久化（主題色、排序等） |

### 檔案 / 媒體

| 套件 | 版本 | 用途 |
|------|------|------|
| `expo-image-picker` | ~17.0.11 | 從相簿選取照片 |
| `expo-image-manipulator` | ~14.0.8 | 照片壓縮 / 裁切 |
| `expo-file-system` | ~19.0.22 | 本機檔案讀寫 |
| `expo-sharing` | ~14.0.8 | 分享檔案到系統 |
| `expo-document-picker` | ~14.0.8 | 選取備份檔案 |
| `fflate` | ^0.8.3 | 快速 ZIP 壓縮（備份/還原） |
| `jszip` | ^3.10.1 | ZIP 解壓縮（舊備份相容） |

### 開發 / 測試

| 套件 | 版本 | 用途 |
|------|------|------|
| `jest` | ^29.7.0 | 單元測試框架 |
| `jest-expo` | ~54.0.17 | Expo 專用 Jest preset |
| `@testing-library/react-native` | ^13.3.3 | React Native 元件測試 |
| `typescript` | ~5.9.2 | 型別檢查 |

---

## 專案目錄結構

```
SPARKWEAR/
├── app/                        # Expo Router 路由頁面
│   ├── index.tsx               # 首頁
│   ├── closet/
│   │   ├── (tabs)/             # 衣櫃 Tab（單品、照片、分類、排行）
│   │   ├── category/[name].tsx # 分類詳情頁
│   │   └── item/
│   │       ├── [id].tsx        # 單品詳情頁
│   │       └── form.tsx        # 新增 / 編輯單品
│   ├── outfits/                # 穿搭記錄頁
│   │   ├── index.tsx
│   │   ├── form.tsx            # 新增穿搭
│   │   └── manual-log.tsx      # 手動登錄使用次數
│   └── settings/               # 設定頁
│
├── src/
│   ├── types/index.ts          # 全域型別定義
│   ├── db/
│   │   ├── schema.ts           # SQL CREATE TABLE 語句
│   │   ├── index.ts            # initDatabase() + 版本 migrations
│   │   ├── provider.ts         # SQLiteProvider（native）
│   │   └── provider.web.ts     # Web stub
│   ├── services/               # 資料庫 CRUD 服務層
│   │   ├── itemService.ts
│   │   ├── outfitService.ts
│   │   ├── categoryService.ts
│   │   ├── photoService.ts
│   │   ├── usageLogService.ts
│   │   └── backupService.ts
│   ├── hooks/                  # React hooks（業務邏輯）
│   │   ├── useItems.ts
│   │   ├── useOutfits.ts
│   │   ├── useCategories.ts
│   │   └── useRanking.ts
│   ├── stores/                 # Zustand 全域狀態
│   │   ├── settingsStore.ts    # 主題色、字體、排序等設定
│   │   └── uiStore.ts          # UI 暫態（搜尋、選取模式）
│   ├── components/
│   │   ├── items/              # 單品相關元件
│   │   ├── outfits/            # 穿搭相關元件
│   │   ├── shared/             # 通用元件（SearchBar、PhotoCarousel...）
│   │   └── ui/                 # 基礎 UI 元件（ConfirmDialog...）
│   ├── constants/              # 常數（預設分類、主題色、壓縮設定）
│   ├── utils/                  # 工具函式
│   └── __tests__/              # 單元測試
│       └── services/
│       └── hooks/
│       └── ...
│
├── assets/                     # 圖示、啟動圖
├── docs/                       # 文件
├── android/                    # Android 原生專案（由 Expo 生成）
├── app.json                    # Expo 設定
├── tsconfig.json               # TypeScript 設定
└── package.json
```

---

## 資料庫設計

### 引擎
- **SQLite**（expo-sqlite），資料庫檔名：`sparkwear.db`
- 設定：`journal_mode = WAL`、`foreign_keys = ON`

### 資料表

| 資料表 | 主要欄位 | 說明 |
|--------|---------|------|
| `items` | id, brand, name, usage_count, category_id... | 單品主表 |
| `outfits` | id, date, item_ids (JSON), photo_ids (JSON) | 穿搭記錄 |
| `item_usage_logs` | id, item_id, logged_at, source | 使用次數明細（含日期） |
| `photos` | id, path, thumb_path, grid_path, detail_path | 照片多尺寸路徑 |
| `categories` | id, name, color, sort_order | 分類 |
| `origins` | id, name, is_default | 來源（日貨、韓貨...） |
| `colors` | id, name, is_default | 顏色 |
| `vote_counts` | item_id, count | 投票數 |
| `settings` | key, value (TEXT) | 應用設定鍵值對 |

### Migration 規則
- 版本以 `PRAGMA user_version` 管理，目前為 v4
- 每個版本對應 `src/db/index.ts` 中的 `if (current < N)` 區塊
- 使用 `INSERT OR IGNORE` 避免重複資料

### ID 格式
```
item-{timestamp}-{random7}      # 單品
outfit-{timestamp}-{random7}    # 穿搭
log-{timestamp}-{random7}       # 使用 log
cat-default-{index}             # 預設分類
log-seed-{outfitId}-{itemId}    # migration 補種資料
log-migration4-{itemId}-{index} # v4 migration 補種
```

### 日期格式
- 所有日期一律 ISO 8601 字串：`'YYYY-MM-DD'` 或 `'YYYY-MM-DDTHH:mm:ss.sssZ'`
- SQLite 欄位型別 `TEXT`

---

## 架構設計原則

### 資料流
```
DB (SQLite)
  └─ services/     純函式，接受 db 參數，不持有狀態
       └─ hooks/   封裝 useState + useCallback，提供 reload()
            └─ screens (app/)   消費 hooks，只做 UI 渲染
```

### 狀態分層
| 層級 | 工具 | 用途 |
|------|------|------|
| 伺服器狀態 | expo-sqlite + custom hooks | 資料庫資料 |
| 全域 UI 狀態 | Zustand (`stores/`) | 主題、設定、選取模式 |
| 本機元件狀態 | useState | 表單欄位、Modal 開關 |
| 設定持久化 | AsyncStorage | 主題色、字體等設定 |

### 照片儲存
- 照片存在本機檔案系統（`expo-file-system`）
- 多尺寸：`thumb`（小圖）、`grid`（格狀）、`detail`（詳情）、`backup-lite`（備份輕量版）
- 路徑以 `photoId` 為索引，存在 `photos` 資料表

---

## 命名規範

### TypeScript / React
| 對象 | 規範 | 範例 |
|------|------|------|
| 變數 / 函式 | camelCase | `getItemById`, `usageCount` |
| 型別 / Interface | PascalCase | `Item`, `RankEntry`, `AppSettings` |
| React 元件 | PascalCase | `ItemCard`, `ConfirmDialog` |
| 常數 | UPPER_SNAKE_CASE | `DEFAULT_THEME_COLOR`, `DB_NAME` |
| Custom Hook | `use` 前綴 | `useItems`, `useRanking` |

### 檔案命名
| 類型 | 規範 | 範例 |
|------|------|------|
| React 元件 | PascalCase.tsx | `ItemCard.tsx` |
| Service | camelCase.ts | `itemService.ts` |
| Hook | camelCase.ts | `useItems.ts` |
| Store | camelCase.ts | `settingsStore.ts` |
| 路由頁面 | camelCase.tsx 或 `[param].tsx` | `form.tsx`, `[id].tsx` |

### SQLite 欄位
- 所有欄位 `snake_case`：`purchase_date`, `category_id`, `created_at`
- 布林值：`INTEGER (0/1)`
- JSON 陣列：`TEXT`（`JSON.stringify`）

---

## Build 與部署

### 環境需求（Android）
```bash
# Java（必須手動設定，不可用 VS Code 內建 JRE）
export JAVA_HOME="/opt/homebrew/Cellar/openjdk@21/21.0.7/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

# ADB
export PATH="$PATH:/Users/{user}/Library/Android/sdk/platform-tools"
```

### 常用指令
```bash
# 開發伺服器
npx expo start --clear

# Release APK 建置
npx expo run:android --variant release

# 安裝到手機
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 型別檢查
npx tsc --noEmit

# 測試
npm test
npm run test:coverage
```

### APK 輸出路徑
```
android/app/build/outputs/apk/release/app-release.apk
```

### App 設定（app.json）
| 項目 | 值 |
|------|-----|
| Bundle ID（iOS） | `com.sparkwear.app` |
| Package（Android） | `com.sparkwear.app` |
| 方向 | portrait only |
| 新架構 | 啟用（newArchEnabled: true） |
| Android edgeToEdge | 啟用 |

---

## 測試規範

- 測試檔案放在 `src/__tests__/`，對應目錄結構
- 檔名格式：`{目標}.test.ts`
- Native 模組 mock 放 `src/__mocks__/`
- 測試框架：Jest + jest-expo + @testing-library/react-native

```bash
# 執行測試
npm test

# 監看模式
npm run test:watch

# 覆蓋率報告
npm run test:coverage
```

---

## TypeScript 設定摘要

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- `@/` 路徑別名對應 `src/`
- strict 模式全開（noImplicitAny, strictNullChecks 等）

---

## 版本紀錄

| 版本 | 說明 |
|------|------|
| v2.0.0 | 現行版本（Expo SDK 54 + React Native 0.81） |
| v1.x | 舊版（Capacitor，已停用） |

備份格式版本：
| 格式版本 | 說明 |
|---------|------|
| v5 | 現行備份格式（SPARKWEAR Expo） |
| v4 | 舊版 Capacitor APP 備份（仍可匯入） |
