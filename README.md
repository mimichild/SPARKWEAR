# SPARKWEAR

衣櫃管理 App — Expo + React Native + TypeScript 雙平台（Android / iOS）

---

## 快速啟動（本機瀏覽器預覽）

```bash
cd /Users/mimi/Documents/SPARKWEAR
npm run web
```

開啟瀏覽器前往 → **http://localhost:8081**

> 注意：Web 版僅供 UI 預覽，部分功能（照片選取、SQLite 儲存）需在真實裝置上執行。

---

## 開發環境需求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 執行 npm / Expo CLI |
| npm | 9+ | 套件管理 |
| Expo Go（手機 App） | 最新版 | Android / iOS 實機預覽 |
| Android Studio | 最新版 | Android 模擬器 / 打包 |
| Xcode | 15+ | iOS 模擬器 / 打包（macOS only） |

---

## 安裝依賴

```bash
npm install
```

---

## 執行方式

### 1. 瀏覽器預覽（最快）

```bash
npm run web
# 或
npx expo start --web
```

開啟 → http://localhost:8081

---

### 2. 手機實機（Expo Go）

```bash
npm start
# 或
npx expo start
```

用手機掃描 QR Code（需安裝 Expo Go）。

---

### 3. Android 模擬器

```bash
npm run android
# 或
npx expo start --android
```

需先在 Android Studio 開啟一個 AVD（虛擬裝置）。

---

### 4. iOS 模擬器（macOS only）

```bash
npm run ios
# 或
npx expo start --ios
```

需安裝 Xcode。

---

## 測試

```bash
# 完整回歸測試（TypeScript + Jest + 視覺回歸）
npm run regression

# 只跑 Jest 單元測試
npm test

# 只跑 TypeScript 型別檢查
npm run typecheck

# 跳過視覺回歸（較快）
bash scripts/regression.sh --skip-visual
```

---

## 專案結構

```
app/              # Expo Router 頁面
├── index.tsx     # 首頁
├── closet/       # 我的衣櫃（單品/照片/分類/排行）
├── outfits/      # 穿搭紀錄
└── settings/     # 設定

src/
├── services/     # 資料存取層（SQLite CRUD）
├── hooks/        # React hooks
├── stores/       # Zustand 狀態管理
├── components/   # UI 元件
├── constants/    # 預設值、壓縮 profile、主題色
├── db/           # SQLite schema & 初始化
└── types/        # TypeScript 型別定義

docs/
└── REQUIREMENTS.md  # 完整需求文件與開發計畫

e2e/
└── visual.sh     # agent-browser 視覺回歸測試

scripts/
└── regression.sh # 完整回歸測試腳本
```

---

## 目前進度

| Phase | 內容 | 狀態 |
|-------|------|------|
| 0 | 專案初始化、DB schema、測試架構 | ✅ 完成 |
| 1 | 我的衣櫃核心（單品 CRUD + 照片系統） | ✅ 完成 |
| 2 | 穿搭紀錄 | 開發中 |
| 3 | 進階瀏覽（排行 / C/P值 / 照片牆） | 待開始 |
| 4 | 設定 & Pro 解鎖 | 待開始 |
| 5 | 匯出 / 匯入（ZIP + 舊版相容） | 待開始 |
| 6 | iOS 驗證 | 待開始 |
| 7 | 打包發布（EAS Build） | 待開始 |

---

## 技術選型

```
React Native 0.81.5 + Expo SDK 54
Expo Router v6（file-based routing）
TypeScript（strict）
expo-sqlite v16（本機資料庫）
Zustand v5（狀態管理）
@shopify/flash-list 2.0（高效能列表）
jszip（備份 ZIP）
```

---

## 舊版參考

舊版（Capacitor + Vanilla JS）位於：`/Users/mimi/Documents/SPARKWEAR-old/`

需求文件：`docs/REQUIREMENTS.md`
