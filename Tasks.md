# Heartsonfire Hybrid App Tasks

## Scope Lock (已確認)
- [x] 不做舊資料 migration（既有 Base64 資料不自動轉換）。
- [x] 匯出檔包含照片實體（支援 Android 匯出後在 iOS 匯入）。
- [x] 照片壓縮採場景分級（手機常見壓縮策略）。
- [x] Android / iOS 並行開發，若資源衝突以 Android 優先。

## Phase 0 - 專案初始化
- [x] 建立 Capacitor 專案骨架並整合現有 Web 資產。
- [x] 建立 Android 與 iOS target（可成功 build + run）。
- [x] 定義環境設定（dev / prod）與資產同步流程。
- [x] 撰寫 Hybrid 啟動流程文件（本機開發、打包、簽章）。

## Current Blockers
- [x] npm registry 無法連線（`ENOTFOUND registry.npmjs.org`），目前無法安裝 Capacitor 套件並建立 Android/iOS native target。（已解除）

## Phase 1 - 儲存架構重構（核心）
- [x] 新增 `PhotoRef` 資料模型（id, path, webSrc, size, width, height, createdAt）。
- [x] 將 `itemPhotos` / `outfitPhotos` 從 Base64 改為 `PhotoRef[]`。
- [x] 封裝儲存層：metadata 與照片分離（metadata: localStorage，照片: IndexedDB，後續替換為 native filesystem）。
- [x] 實作圖片刪除時的引用檢查與孤兒檔清理。
- [x] 保留原有 `persistAll()` 流程，但移除大圖字串寫入（新上傳資料）。

## Phase 2 - JS Bridge / Native Plugin
- [x] 定義 Bridge API：
  - [x] `pickImages(limit, source)`（Android/iOS 原生相簿選圖）
  - [x] `saveImage(tempUri, profile)`（支援 `tempUri` 與 `dataUrl`）
  - [x] `getImageSrc(path)`
  - [x] `deleteImage(path)`
  - [x] `getStorageStats()`
- [x] Android 實作（Java）Filesystem + 圖片處理。
- [x] iOS 實作（Swift）Filesystem + 圖片處理。
- [x] Web 端 service 封裝（統一呼叫與錯誤處理，原生失敗時 fallback IndexedDB）。

## Phase 3 - 壓縮策略（場景分級）
- [x] 定義壓縮 profile：
  - [x] `thumb`: 320px 邊長, JPEG quality 0.60~0.70
  - [x] `grid`: 720x960, JPEG quality 0.72~0.80
  - [x] `detail`: 1080x1440, JPEG quality 0.78~0.85
  - [x] `backup-lite`: 長邊 1600, JPEG quality 0.82~0.88
- [x] 原生層實作縮放 + 壓縮 + EXIF 方向修正。
- [x] 根據頁面場景選 profile（牆圖/列表/詳情）。
- [ ] 壓縮後大小與畫質抽樣驗證（至少 100 張樣本）。
  - [ ] Android 實機抽樣 100 張（直式/橫式/來源混合）
  - [ ] iOS 實機抽樣 100 張（直式/橫式/來源混合）
  - [ ] 統計平均檔案大小、P95、失敗率與方向錯誤率
  - [x] 輸出驗證報告工具已完成（CSV + markdown，`npm run report:backup -- <zip>`）

## Phase 4 - 匯出 / 匯入（含照片實體）
- [x] 匯出 metadata JSON + 照片實體（zip: `manifest.json + photos/*`）。
- [x] 匯入流程可恢復 metadata，並將照片寫入本機私有目錄後重建 `PhotoRef`。
- [x] 匯入後無法讀取的圖片，標記為「遺失資源」並提供 UI 提示。
- [ ] 跨平台驗證：Android 匯出 -> iOS 匯入可正常顯示圖片。
- [ ] 跨平台驗證：iOS 匯出 -> Android 匯入可正常顯示圖片。
  - [x] 驗證清單文件已建立（`docs/CROSS_PLATFORM_VALIDATION.md`）

## Phase 5 - UI/UX 與錯誤處理
- [x] 上傳流程顯示進度（選圖 -> 壓縮 -> 儲存 -> 完成）。
- [x] Bridge 失敗提供可理解訊息（權限/空間不足/檔案損毀）。
- [x] 設定頁顯示儲存統計（圖片數、占用空間、最近清理時間）。
- [x] 新增「清理無引用圖片」入口。

## Phase 6 - 測試與驗收
- [ ] 單元測試：資料模型與儲存層（Web）。
  - [x] 備份檔完整性驗證腳本已完成（`npm run validate:backup -- <zip>`）
- [ ] 整合測試：Bridge API（Android/iOS）。
  - [x] 跨平台測試 checklist 已完成（`docs/CROSS_PLATFORM_VALIDATION.md`）
- [ ] 實機測試：300 張連續上傳不觸發 localStorage quota 錯誤。
- [ ] 實機測試：冷啟動後圖片可正常顯示。
- [ ] 實機測試：刪除商品/穿搭後對應檔案可回收。
- [ ] 實機測試：離線可瀏覽與新增資料。

## Acceptance Criteria（最終驗收）
- [ ] `localStorage` 不再出現 `data:image/...` 大型字串。
- [ ] 300 張照片（壓縮後約 200~400KB）可穩定儲存與瀏覽。
- [ ] Android / iOS 皆可完成新增、編輯、刪除、顯示圖片流程。
- [ ] Android 匯出（含照片）後，iOS 匯入可完整顯示圖片。
- [ ] iOS 匯出（含照片）後，Android 匯入可完整顯示圖片。
- [ ] 匯入後遺失圖片有明確提示，不造成 App crash。

## Risks / Notes
- [ ] 不做 migration 代表舊版資料（Base64）不會自動進新架構。
- [ ] 匯出含照片實體會讓備份檔案變大，需處理壓縮與匯入時間。
- [ ] iOS 權限與背景清理策略可能與 Android 不同，需分平台驗證。
