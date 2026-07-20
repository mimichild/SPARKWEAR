# 進度日誌

<!-- 寫法與完整範例見 docs/harness/PLAYBOOK.md §5。
     規則：新的工作階段記錄插在「## 工作階段日誌」標題正下方（最新在最上面），編號遞增。
     「目前已驗證狀態」每次收尾都要更新，永遠反映最新事實。 -->

## 目前已驗證狀態

- 儲存庫根目錄：/Users/mimi/Documents/SPARKWEAR
- 標準啟動路徑：`RUN_START_COMMAND=1 ./init.sh`（pnpm start = expo start；Android 實機建置用 /build-apk skill）
- 標準驗證路徑：`./init.sh`（pnpm install + pnpm test；2026-07-17 為 303 tests passed；另有 pnpm typecheck、pnpm regression）
- 目前最高優先級未完成功能：ios-002 模擬器驗證核心流程（資料庫讀寫、相機/相簿權限）
- 目前 blocker：無
- 背景：Android/APK 功能已完成 Phase 0-5；iOS 本機環境已打通（Xcode 26.6、CocoaPods 1.17.0），模擬器可正常啟動 App（ios-001 passing）；行動計畫見 docs/IOS_READINESS_ROADMAP.md

## 工作階段日誌

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
