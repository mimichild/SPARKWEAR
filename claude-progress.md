# 進度日誌

<!-- 寫法與完整範例見 docs/harness/PLAYBOOK.md §5。
     規則：新的工作階段記錄插在「## 工作階段日誌」標題正下方（最新在最上面），編號遞增。
     「目前已驗證狀態」每次收尾都要更新，永遠反映最新事實。 -->

## 目前已驗證狀態

- 儲存庫根目錄：/Users/mimi/Documents/SPARKWEAR
- 標準啟動路徑：`RUN_START_COMMAND=1 ./init.sh`（pnpm start = expo start；Android 實機建置用 /build-apk skill）
- 標準驗證路徑：`./init.sh`（pnpm install + pnpm test；2026-07-23 為 316 tests passed；另有 pnpm typecheck、pnpm regression）
- 目前最高優先級未完成功能：無（monetization-001 已 passing）；下一步是把同一套付費功能模式複製到 SPARKPLATE/SPARKSHAPE/SPARKFIT/SPARKLOG
- 目前 blocker：無
- 背景：Apple Developer Program 已生效（2026-07-20）；ios-001～ios-008 皆已 passing（含實機驗證相機拍照）；EAS 雲端建置成功產出 .ipa；已設定 EAS Update（OTA）支援，之後純 JS/TS 改動可以用 eas update 直接推送不用整套重 build；eas.json 加了 ascAppId，eas submit 可以完全非互動執行；SPARKWEAR 的匯入是走 SQL INSERT（非檔案覆蓋），確認沒有 SPARKPLATE 那種匯入唯讀 bug 的風險；行動計畫見 docs/IOS_READINESS_ROADMAP.md。2026-07-23 起開始做付費功能：安裝 react-native-google-mobile-ads + react-native-purchases，新增 src/constants/monetization.ts（目前用 Google 測試 ID + 空字串佔位 RevenueCat Key）、src/services/purchases.ts、src/hooks/useProGate.ts（未通過 Pro 鎖時跳升級提示）、src/hooks/useIsPro.ts（Android 因無付費入口一律視為 Pro，iOS 才看真實訂閱狀態）、src/components/AdBanner.tsx；VIP 兌換碼機制已依使用者指示完全移除，PRO 解鎖區塊改成「升級 Pro」／「恢復購買」按鈕。

## 工作階段日誌

### 工作階段 013

- 日期：2026-07-23
- 本輪目標：分頁列底部安全區改成依「有沒有廣告」動態決定，而不是固定不留（使用者要求：Android／iOS Pro 沒廣告時分頁列是螢幕真正的底部，要補回安全區；有廣告時分頁列上面接的是 AdBanner，不用留）
- 已完成：
  - `app/closet/(tabs)/_layout.tsx` 加 `useSafeAreaInsets()` + `useIsPro()`，`bottomInset = isPro ? insets.bottom : 0`，動態加到 `tabBarStyle.height`/`paddingBottom`
  - 順手修掉 4 個分頁畫面（index/photos/category/ranking）原本 `SafeAreaView edges` 固定包含 `'bottom'`，導致不管有沒有廣告都無條件多留一份安全區的重複扣打問題（跟 SPARKSHAPE 上一輪修的分頁列過高是同一類 bug，只是這裡背景色跟分頁列不同色所以沒那麼顯眼）；改成只留 `['left','right']`，安全區統一交給分頁列這個唯一入口處理
- 執行過的驗證：`npx tsc --noEmit`（唯一錯誤是 `app/outfits/form.tsx` 既有型別問題，用 `git stash` 確認改動前就存在、與本次無關）；`npx jest`（22 suites、316 tests 全過）
- 已知風險或未解決問題：Pro（無廣告）分支目前無法在模擬器上實測（RevenueCat 尚未設定金鑰，iOS 端目前恆為免費/有廣告狀態；Android 端有實機才能測），邏輯依賴標準 `useSafeAreaInsets()` 數值疊加，未做額外模擬器驗證
- 下一步最佳動作：待 RevenueCat 金鑰設定好或有 Android 實機時，實際切到 Pro 狀態確認分頁列底部有補回安全區、按鈕沒有貼著 Home 指示條

### 工作階段 012

- 日期：2026-07-23
- 本輪目標：開始做付費功能（monetization-001），先把 SPARKWEAR 做成 AdMob＋RevenueCat＋Pro 功能鎖的範本
- 已完成：
  - 安裝 `react-native-google-mobile-ads`（config plugin 寫入 app.json，Info.plist 的 GADApplicationIdentifier 已用 Google 官方測試 App ID）與 `react-native-purchases`
  - 新增 `src/constants/monetization.ts`、`src/services/purchases.ts`（`fetchProStatus`/`purchasePro`/`restorePurchases`，空 API Key 時安全 no-op/丟出明確錯誤）、`src/hooks/useProGate.ts`（統一的「跳升級提示」互動）
  - `PHOTO_MAX_FREE` 5→2；`app/settings/index.tsx` 的主題色/字體/匯出/匯入接上 `requirePro` 鎖
  - `npx expo prebuild --platform ios && pod install` 裝好原生依賴，`npx expo run:ios` 建置成功並在模擬器實測：主題色/匯出/匯入皆正確跳出升級提示，字體區塊正確顯示鎖定樣式
  - 使用者中途追加兩項決策並已實作：(1) 移除 VIP 兌換碼機制（`VIP_CODE`/`isValidVipCode` 連同測試都刪掉），PRO 解鎖區塊改成正式的「升級 Pro」／「恢復購買」按鈕；(2) 新增 `src/hooks/useIsPro.ts`，Android 沒有付費入口、一律視為 Pro（全功能免費、不顯示廣告），iOS 才看 RevenueCat 真實狀態——`useProGate`、`AdBanner`、兩個 photo form 都改用這個共用 hook
  - 廣告版位依使用者要求擴大：首頁、穿搭紀錄列表各自放一條；衣櫃的四個分頁（單品/照片/分類/排行）原本各自放一條會重複渲染且位置跑到分頁列「上方」，改成掛在 `app/closet/(tabs)/_layout.tsx` 共用一條、顯示在分頁列下方——這個調整是使用者實測後回饋才發現要改的，過程中來回了兩次
  - 使用者在模擬器逐一確認過首頁/衣櫃四分頁/穿搭列表的廣告都正確顯示在正確位置；也確認新增單品第 3 張照片會被擋（免費版上限 2 張）
  - 應使用者要求建置 Android release APK 驗證「Android 全功能免費開放」的行為，過程中發現並修好兩個跟付費功能無關的既有問題：
    (a) `react-native-google-mobile-ads@16.4.0` 拉進來的 `play-services-ads 25.4.0` 用了比這個 Expo SDK 工具鏈支援上限（Kotlin 2.2.20）更新的 Kotlin metadata（2.3.0），`compileReleaseKotlin` 直接編譯失敗；改鎖定 `react-native-google-mobile-ads@16.3.4`（對應相容的 `play-services-ads 25.0.0`）解決，之後升級這個套件要注意同樣的 Kotlin 版本天花板問題
    (b) 使用者在自己手機上（真實資料 2916 張照片）用舊版 App 匯出備份時失敗，`Invalid URI: content://.../tree/primary%3ASPARKWEAR`；根因是 `android/app/src/main/java/com/sparkwear/app/DownloadsModule.kt` 的 `saveToTreeUri` 把 SAF 選好的原始 tree URI 直接丟給 `DocumentsContract.createDocument()` 當 parent，但那個 API 要的是「文件」URI（需要先用 `DocumentsContract.buildDocumentUriUsingTree` 轉換）；已修好。這個檔案在 gitignore 掉的 `android/` 資料夾裡，跟 SPARKSHAPE 的 iOS 原生修復是同樣的風險（見 `project_sparkshape_ios_native_fixes` 記憶）——刪掉 `android/` 重跑 `expo prebuild` 會遺失這個修復，之後要轉成 config plugin 才安全
  - Build 成功，APK 上傳至 `SPARK-Builds/SPARKWEAR/sparkwear-v1.0.0-20260723-1406.apk`；使用者一開始在自己手機上用舊版 App 想先備份也失敗（就是 (b) 那個 bug），教他改用「分享至…」（走 `expo-sharing`，不會碰到壞掉的 SAF 存檔邏輯）先備份成功；接著安裝新版 APK，確認資料完整保留（同一把 debug keystore 簽章，Android 視為正常更新不會清空資料）、匯出功能修好、且 Android 版無廣告、全部功能免費可用
  - 使用者最終回報「測試沒有問題」，monetization-001 改為 `passing`
- 執行過的驗證：`./init.sh`（316 tests passed，含新增 `useIsPro.test.ts`/`purchases.test.ts`/`useProGate.test.ts`）、`npx tsc --noEmit -p .`（無新增錯誤）、`npx expo run:ios` 模擬器手動操作（主題色/匯出/匯入升級提示、字體鎖定樣式、AdMob WebView 廣告資源載入成功、各頁面廣告位置、照片上限）、`./gradlew assembleRelease`（Android release build 成功）、使用者在自己手機（真實資料 2916 張照片）實機驗證
- 已擷取證據：見 feature_list.json monetization-001 evidence
- 提交記錄：（見本輪 commit）
- 已知風險或未解決問題：RevenueCat/AdMob 都還是測試佔位設定，使用者還沒申請正式帳號，正式上架前要記得換成真的 Key／廣告單元 ID；DownloadsModule.kt 的 SAF 修復跟 android/build.gradle 的 Kotlin 版本鎖定都在被 gitignore 的 android/ 資料夾裡，沒有進版控，之後如果整個刪掉重跑 prebuild 會遺失（需要轉成 config plugin 才安全，是既有的已知風險，非本輪新增）
- 下一步最佳動作：monetization-001 已 passing，複製同一套模式（useProGate/useIsPro/AdBanner/purchases.ts/monetization.ts＋廣告版位規則）到 SPARKPLATE/SPARKSHAPE/SPARKFIT/SPARKLOG，每個 App 各自要鎖的功能清單見 monetization_spec_5_apps 記憶

### 工作階段 011

- 日期：2026-07-22
- 本輪目標：設定 EAS Update（OTA）支援，並收尾 ios-006（相機拍照）的實機驗證
- 已完成：
  - `eas update:configure` 設定 OTA 更新（安裝 expo-updates、app.json 加 updates.url/runtimeVersion、eas.json 加 channel）；順手修掉指令產生的重複 permissions 陣列
  - eas.json 加上 `ascAppId`，發現這樣設定後 `eas submit` 可以完全非互動執行（不用再請使用者開 Terminal 手動跑）
  - 重新 `eas build`（Build 6，含 ios-006/007/008 修復＋OTA 設定）→ `eas submit` → 使用者在 App Store Connect 加入測試群組 → iPhone TestFlight 安裝
  - 使用者實機測試相機拍照，確認「相機沒問題」，ios-006 完整驗證通過
- 執行過的驗證：`./init.sh`（306 tests passed）、實機相機拍照測試
- 已擷取證據：見 feature_list.json ios-006 evidence
- 提交記錄：（本輪 commit）
- 已知風險或未解決問題：無
- 下一步最佳動作：feature_list.json 全部 passing，無待辦項目；之後純 JS/TS 修改可優先考慮 `eas update` 而非整套重 build

### 工作階段 010

- 日期：2026-07-22
- 本輪目標：處理 ios-008（穿搭未自動累計單品使用次數）
- 已完成：
  - 重新查證發現 2026-07-21 的初步判斷是錯的：`app/outfits/form.tsx`、`app/outfits/manual-log.tsx` 其實都有正確呼叫既有的 `incrementUsageCount()`，DB 寫入完全正常
  - 真正根因：`app/closet/item/[id].tsx`（單品詳情頁）用普通 `useEffect([id, db])` 載入資料，只在第一次掛載時抓，從新增穿搭等畫面返回同一個單品時不會重新查詢，畫面停留在舊快取——是顯示端沒重新整理，不是資料沒寫入。同專案其他列表畫面（衣櫃列表、分類列表、排行榜）都已經正確用 `useFocusEffect`，只有這個詳情頁漏掉
  - 修法：把該畫面的資料載入改成 `useFocusEffect`，跟其他畫面用同一套慣例
  - 模擬器實測：新增穿搭關聯單品後返回詳情頁，使用次數正確 +1
- 執行過的驗證：`pnpm test`（306 tests passed）、模擬器手動操作（使用者確認「有 +1 了」）
- 已擷取證據：見 feature_list.json ios-008 evidence
- 提交記錄：（本輪 commit）
- 已知風險或未解決問題：ios-006 仍 blocked 等 iPhone
- 下一步最佳動作：等使用者有 iPhone 時收尾 ios-006；或處理其他 App 的待修清單（SPARKPLATE/SPARKSHAPE/SPARKFIT 各自的 ios-006）

### 工作階段 009

- 日期：2026-07-22
- 本輪目標：ios-006 先標 blocked（等 iPhone），接著處理 ios-007（橫向照片裁切內容）
- 已完成：
  - ios-006 改為 blocked，notes 補上現象／已嘗試／建議解法
  - 找到 ios-007 真正根因：`PhotoEditorModal.tsx` 裡 `<Image resizeMode="cover">` 本身固定為 FRAME_W x FRAME_H，原生渲染階段就已經把超出畫面的部分丟棄，之後的 pinch/pan 手勢只能在「已經被丟棄過一次」的畫面裡再操作，永遠拿不回被丟棄的內容——不是使用者不會用縮放，是架構上本來就不可能透過縮放/拖曳復原
  - 修法：改成一開始以「完整顯示整張照片」（containFactor）為縮放基準，預設縮放沿用舊行為效果（coverFactor/containFactor，維持原本大多數照片的預設體驗不變），使用者可以往外縮到 1（＝完整照片含留白）自己選要保留的內容；裁切輸出依「是否還留白」分流：未填滿裁切框時改用畫面截圖烘焙（沿用既有濾鏡調整用的 captureRef 機制），完全填滿時維持原本像素級裁切保持畫質
  - 模擬器實測：選橫向照片，確認能看到完整內容、可以縮放拖曳選位置，裁切完成後照片正常無變形無黑邊
- 執行過的驗證：`pnpm test`（306 tests passed）、模擬器手動操作（使用者確認畫面與最終結果）
- 已擷取證據：見 feature_list.json ios-007 evidence
- 提交記錄：（本輪 commit）
- 已知風險或未解決問題：ios-006 仍 blocked 等 iPhone
- 下一步最佳動作：ios-008（穿搭未自動累計單品使用次數），或等使用者有 iPhone 時收尾 ios-006

### 工作階段 008

- 日期：2026-07-22
- 本輪目標：開始處理 ios-006（新增單品支援相機拍照）
- 已完成：
  - `src/services/photoService.ts` 新增 `pickFromCamera()`（`launchCameraAsync` + 相機權限請求），mock 檔案早就有對應的 `launchCameraAsync`/`requestCameraPermissionsAsync`，app.json 的 `NSCameraUsageDescription`／`expo-image-picker` plugin 的 `cameraPermission` 也早就設定好，純粹是程式碼沒接上
  - `app/closet/item/form.tsx` 的「+」新增照片按鈕改成 `Alert.alert` 選單（拍照／從相簿選擇／取消），沿用既有的 `PhotoEditorModal` 編輯流程
  - 新增 `pickFromCamera` 的單元測試（權限拒絕／使用者取消／成功拍照三種情境）
  - 模擬器實測時踩到一個新 bug 並修好：`expo-image-picker` 在無相機硬體（模擬器）時 `launchCameraAsync` 會直接 throw，但 `handlePickFromCamera` 沒包 try/catch，導致跳出未處理例外的紅色 LogBox 畫面；修法是在 `handlePickFromCamera` 加 try/catch，改成 `Alert.alert('無法開啟相機', ...)` 友善提示
  - 模擬器上確認「從相簿選擇」跟改動前行為一致（回歸測試通過）
- 執行過的驗證：`pnpm test`（306 tests passed）、模擬器手動操作（選單跳出、拍照錯誤處理、相簿選圖回歸）
- 已擷取證據：見 feature_list.json ios-006 evidence
- 提交記錄：（本輪 commit）
- 已知風險或未解決問題：模擬器沒有相機硬體，無法驗證「真的拍到一張照片並存檔成功」這個核心路徑，需要使用者拿實體 iPhone 測試才能把 ios-006 標成 passing
- 下一步最佳動作：等使用者有 iPhone 可測時，完成 ios-006 最後一步；或先處理 ios-007／ios-008

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
