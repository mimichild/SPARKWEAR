# 進度日誌

<!-- 寫法與完整範例見 docs/harness/PLAYBOOK.md §5。
     規則：新的工作階段記錄插在「## 工作階段日誌」標題正下方（最新在最上面），編號遞增。
     「目前已驗證狀態」每次收尾都要更新，永遠反映最新事實。 -->

## 目前已驗證狀態

- 儲存庫根目錄：/Users/mimi/Documents/SPARKWEAR
- 標準啟動路徑：`RUN_START_COMMAND=1 ./init.sh`（pnpm start = expo start；Android 實機建置用 /build-apk skill）
- 標準驗證路徑：`./init.sh`（pnpm install + pnpm test；2026-07-17 為 303 tests passed；另有 pnpm typecheck、pnpm regression）
- 目前最高優先級未完成功能：ios-006 新增單品支援相機拍照（not_started；ios-005 已 passing）
- 目前 blocker：無
- 背景：Apple Developer Program 已生效（2026-07-20）；ios-001～ios-005 皆已 passing（含 TestFlight 實機驗證），EAS 雲端建置成功產出 .ipa；SPARKWEAR 的匯入是走 SQL INSERT（非檔案覆蓋），確認沒有 SPARKPLATE 那種匯入唯讀 bug 的風險；實機測試時發現 3 個既有缺口，已建 ios-006/007/008 追蹤（相機拍照未實作、橫向照片裁切內容、穿搭未自動累計使用次數）；行動計畫見 docs/IOS_READINESS_ROADMAP.md

## 工作階段日誌

### 工作階段 007

- 日期：2026-07-21
- 本輪目標：完成 ios-005（TestFlight 內部測試）剩餘步驟——加入測試群組＋實機驗證
- 已完成：
  - 使用者於 App Store Connect 把 Build 4 加入內部測試群組，iPhone 用 TestFlight 成功安裝並開啟 SPARKWEAR
  - 實機重跑核心流程：新增單品（相簿選圖）、完全關閉重開確認持久化、新增穿搭紀錄關聯單品，皆正常
  - 過程中發現 App 其實沒有相機拍照功能（原驗證步驟「含真實相機拍照」是規劃時的錯誤假設），與使用者確認後修改該條驗證步驟為「相簿選圖」，並記錄原因於 notes
  - 額外發現兩個既有缺口：橫向照片裁切會裁掉內容、新增穿搭未自動累計單品使用次數；皆與使用者確認後開新 feature（ios-006 相機拍照、ios-007 裁切 UX、ios-008 使用次數）追蹤，不影響 ios-005 通過
- 執行過的驗證：見上述，皆為使用者實機手動操作
- 已擷取證據：見 feature_list.json ios-005 evidence
- 提交記錄：（本輪 commit）
- 已知風險或未解決問題：ios-006/007/008 尚未規劃，僅記錄現象
- 下一步最佳動作：ios-006（優先級最高的未完成項目）；或視使用者意願先處理其他 App 的 ios-005

### 工作階段 006

- 日期：2026-07-21
- 本輪目標：ios-005 中不需要實機的部分先做完（eas submit）
- 已完成：使用者於 Terminal.app 互動執行 `eas submit --platform ios --profile production --latest`，Build b5bff906-b472-41ab-9806-84770afcb1e1 上傳成功，Apple 端已開始處理
- 執行過的驗證：實際跑 eas submit，看到「Submitted your app to Apple App Store Connect!」完成訊息
- 已擷取證據：見 feature_list.json ios-005 evidence
- 提交記錄：767b613
- 已知風險或未解決問題：ios-005 剩餘兩步（App Store Connect 加入內部測試群組、實機安裝與核心流程驗證）需要使用者的實體 iPhone
- 下一步最佳動作：等使用者有 iPhone 可測時，完成 ios-005 剩餘步驟

### 工作階段 005

- 日期：2026-07-20
- 本輪目標：完成 ios-004（EAS iOS 雲端建置成功）
- 已完成：
  - `eas-cli login`（使用者本人透過瀏覽器完成，帳號 mimichild）
  - `eas init` 建立 EAS 專案並連結 app.json
  - 第一次 `eas build --platform ios --profile production`（互動模式，使用者本人登入 Apple ID）成功建立 Distribution Certificate + Provisioning Profile，但建置本身在 INSTALL_DEPENDENCIES 階段失敗
  - 下載並解壓建置 log（brotli 壓縮格式）分析，找到根因：EAS 雲端建置機器預設 Node.js 20.19.4，但 `package.json` 的 `packageManager: pnpm@11.13.0` 需要 Node.js ≥ 22.13，跟程式碼或資料庫無關
  - 修復：`eas.json` 三個 build profile 都加上 `"node": "22.13.0"`，不動本機開發環境的 pnpm 版本
  - 修復後非互動模式重新建置成功，產出 .ipa
- 執行過的驗證：實際跑 EAS 雲端建置（失敗一次、修復後成功一次）
- 已擷取證據：見 feature_list.json ios-004 evidence，含 build URL 與 .ipa 下載連結
- 提交記錄：（見本輪 commit）
- 已知風險或未解決問題：無新增；這個 Node 版本問題預期會在其他四個 SPARK App 重現（都用同一套 pnpm 11.13.0），已預先在它們的 eas.json 套用同樣修法
- 下一步最佳動作：開始 ios-005（TestFlight 內部測試，需要實體 iPhone）

### 工作階段 004

- 日期：2026-07-20
- 本輪目標：完成 ios-003（模擬器驗證 ZIP 匯出/匯入）
- 已完成：使用者在模擬器手動執行匯出 → 覆蓋模式匯入 → 合併模式匯入，用 sqlite3 直接查容器內 sparkwear.db 確認 items/outfits 筆數與 id 在整個過程中維持一致（4 筆 items、3 筆 outfits），沒有重複也沒有遺失；Metro log 全程無錯誤
- 執行過的驗證：模擬器手動操作＋sqlite3 直接查詢資料庫內容＋Metro log 檢查
- 已擷取證據：見 feature_list.json ios-003 evidence；截圖 docs/ios-testing/ios-003-import-result.png
- 提交記錄：（見本輪 commit）
- 已知風險或未解決問題：ios-004/ios-005 卡在還沒申請的 Apple Developer 帳號，先標記 blocker 待使用者決定是否申請
- 下一步最佳動作：等 Apple Developer 帳號申請下來後才能繼續 ios-004；在那之前沒有可獨立推進的 SPARKWEAR iOS 項目

### 工作階段 003

- 日期：2026-07-20
- 本輪目標：完成 ios-002（模擬器驗證核心流程：資料庫讀寫與相機/相簿權限）
- 已完成：使用者在模擬器手動新增一件單品（含相簿選照片）、新增 2 筆穿搭紀錄，並完全關閉 App 重開確認資料仍在；用 sqlite3 直接讀取容器內的 sparkwear.db（此專案用 WAL 模式，需連同 -wal/-shm 一起複製才能讀到最新資料，跟 SPARKPLATE 的 rollback journal 模式不同）確認寫入真的成功，不只是看畫面
- 執行過的驗證：模擬器手動操作＋sqlite3 直接查詢資料庫內容＋simctl terminate/launch 持久化測試
- 已擷取證據：見 feature_list.json ios-002 evidence；截圖 docs/ios-testing/ios-002-closet-item.png
- 提交記錄：（見本輪 commit）
- 已知風險或未解決問題：無
- 下一步最佳動作：開始 ios-003（模擬器驗證 ZIP 匯出/匯入）——注意此專案是 WAL 模式，跟 SPARKPLATE 修好的匯入唯讀 bug 是否適用/是否有類似風險，值得優先檢查 DBProvider 的匯入重連邏輯是否存在或需要補上

### 工作階段 002

- 日期：2026-07-20
- 本輪目標：接續 ios-001（本機 Xcode 環境打通並在 iOS 模擬器啟動 App）
- 已完成：發現這台 iMac 已裝好完整版 Xcode 26.6 + CocoaPods 1.17.0（早於本輪，環境檢查一次通過）；執行 `npx expo run:ios` 首次 prebuild + 原生建置成功；App 在 iPhone 17 Pro 模擬器正常開啟並顯示首頁，無紅屏
- 執行過的驗證：`xcodebuild -version` / `pod --version` / `xcrun simctl list devices available`；`npx expo run:ios`；`xcrun simctl io booted screenshot`
- 已擷取證據：見 feature_list.json ios-001 evidence；截圖存於 docs/ios-testing/ios-001-simulator-home.png
- 提交記錄：（見本輪 commit）
- 已知風險或未解決問題：畫面下方有非致命的 Metro debugger 警告橫幅；尚未驗證衣櫃/穿搭 tab 內部功能
- 下一步最佳動作：開始 ios-002（模擬器驗證核心流程：資料庫讀寫與相機/相簿權限）

### 工作階段 001

- 日期：2026-07-17
- 本輪目標：導入 harness-engineering 工作流（/harness-init）
- 已完成：安裝範本（AGENTS.md、CLAUDE.md、init.sh、claude-progress.md、feature_list.json、docs/harness/）；init.sh 設定為 pnpm；修復過時測試 theme.test.ts（字體 schema 已從 native 欄位改為 ios/android 欄位，測試同步更新並加驗「至少支援一個平台」）；與使用者確認 iOS 路線 5 項功能寫入 feature_list.json
- 執行過的驗證：./init.sh（pnpm install + pnpm test）
- 已擷取證據：2026-07-17 | ./init.sh | Tests: 303 passed, 303 total，基準驗證通過
- 提交記錄：（見本輪 commit：chore: 導入 harness-engineering 工作流）
- 已知風險或未解決問題：ios-004/005 依賴 Apple Developer 帳號（尚未申請）；模擬器無實體相機，拍照完整驗證延至實機
- 下一步最佳動作：開始 ios-001（先照 docs/ios-testing/README.md 檢查 Xcode 環境）
