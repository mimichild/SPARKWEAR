# 進度日誌

<!-- 寫法與完整範例見 docs/harness/PLAYBOOK.md §5。
     規則：新的工作階段記錄插在「## 工作階段日誌」標題正下方（最新在最上面），編號遞增。
     「目前已驗證狀態」每次收尾都要更新，永遠反映最新事實。 -->

## 目前已驗證狀態

- 儲存庫根目錄：/Users/mimi/Documents/SPARKWEAR
- 標準啟動路徑：`RUN_START_COMMAND=1 ./init.sh`（pnpm start = expo start；Android 實機建置用 /build-apk skill）
- 標準驗證路徑：`./init.sh`（pnpm install + pnpm test；2026-08-10 為 321 tests passed；另有 pnpm typecheck、pnpm regression）
- 目前最高優先級未完成功能：無
- 其餘功能：monetization-001、ios-009、items-001、items-002（單品詳細頁／穿搭詳細頁左右滑動切換上一筆/下一筆項目）皆已 passing；items-002 已由使用者實機安裝 sparkwear-v2.0.0-20260810-1352.apk 測試「滑動測試沒問題」；AdMob／App Store 訂閱項目／RevenueCat 三塊監利化基礎設施全部完成並**已實機驗證通過**；`useProGate.ts` 修好一個真實 bug（鎖定功能跳出的升級提示，按「升級 Pro」改成直接觸發購買，不再導頁——導頁設計在使用者已身處設定頁時會看起來沒反應）；廣告目前還沒顯示（AdMob 帳號審核中，正常現象）；2026-08-10 修好「刪除穿搭紀錄後單品使用次數未跟著減少」的 bug（ios-009）；2026-08-10 新增單品新增/編輯表單的「使用次數」手動輸入欄並修好單品詳細頁沒同步更新的問題（items-001，使用者已實機驗證新增/編輯操作正常）
- 目前 blocker：無
- 背景：Apple Developer Program 已生效（2026-07-20）；ios-001～ios-008 皆已 passing（含實機驗證相機拍照）；EAS 雲端建置成功產出 .ipa；已設定 EAS Update（OTA）支援，之後純 JS/TS 改動可以用 eas update 直接推送不用整套重 build；eas.json 加了 ascAppId，eas submit 可以完全非互動執行；SPARKWEAR 的匯入是走 SQL INSERT（非檔案覆蓋），確認沒有 SPARKPLATE 那種匯入唯讀 bug 的風險；行動計畫見 docs/IOS_READINESS_ROADMAP.md。2026-07-23 起開始做付費功能：安裝 react-native-google-mobile-ads + react-native-purchases，新增 src/constants/monetization.ts（目前用 Google 測試 ID + 空字串佔位 RevenueCat Key）、src/services/purchases.ts、src/hooks/useProGate.ts（未通過 Pro 鎖時跳升級提示）、src/hooks/useIsPro.ts（Android 因無付費入口一律視為 Pro，iOS 才看真實訂閱狀態）、src/components/AdBanner.tsx；VIP 兌換碼機制已依使用者指示完全移除，PRO 解鎖區塊改成「升級 Pro」／「恢復購買」按鈕。

## 工作階段日誌

### 工作階段 024

- 日期：2026-08-10
- 本輪目標：使用者用工作階段 023 建的 APK 實機測試左右滑動切換，並追加一個小型 UI 要求
- 已完成：
  - 使用者回報「滑動測試沒問題」——單品詳細頁與穿搭詳細頁的左右滑動切換皆確認正常，`items-002` 補齊實機測試 evidence 並改成 `passing`
  - 使用者回報穿搭詳細頁左上角「← 返回」的箭頭多餘，`app/outfits/[id].tsx` 改成純文字「返回」，跟其他畫面的返回按鈕一致；只是文字調整，未另開 feature 追蹤
- 執行過的驗證：`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`pnpm test`（23 suites、330 tests 全過）
- 已知風險或未解決問題：箭頭移除這個小改動本身還沒有另外建新 APK 給使用者看畫面，使用者表示先不用、之後有需要再一起測
- 下一步最佳動作：無明確待辦，等使用者下次有新需求

### 工作階段 023

- 日期：2026-08-10
- 本輪目標：使用者追加需求——穿搭紀錄列表點進某筆穿搭詳細頁後，也要能左右滑動切換上一項/下一項（沿用工作階段 022 剛做完的單品滑動切換機制）
- 已完成：
  - `src/stores/uiStore.ts` 新增 `outfitNavIds`/`setOutfitNavIds`（跟既有 `itemNavIds`/`setItemNavIds`同一套模式）
  - `app/outfits/index.tsx`（穿搭紀錄列表）的 `handlePress` 在 `router.push` 進穿搭詳細頁前，把當下畫面（含搜尋/排序後）可見的清單順序寫入 `outfitNavIds`
  - `app/outfits/[id].tsx`：沿用 `src/utils/itemNav.ts` 既有的 `getNeighborIds()`（純函式本來就不限定 item，直接可用在 outfit id 清單上）算出上一筆/下一筆穿搭 id；同樣用 `Gesture.Pan()` 包住「照片輪播以外」的區域（資訊列、搭配單品照片牆），滑動超過螢幕寬度 25% 且存在對應項目時用 `router.replace` 切換
  - 使用者要求的方向語意「左向右滑到上一項（較新）、右向左滑到下一項（較舊）」跟工作階段 022 單品滑動的 prevId/nextId 語意完全一致，沒有另外反轉方向邏輯
  - 兩個不在本次需求範圍內、但也會連到穿搭/單品詳細頁的入口改成清空對應 NavIds，避免沿用不相關清單造成滑動結果錯亂：`app/closet/(tabs)/ranking.tsx`／`app/outfits/[id].tsx` 連到單品詳細頁的入口清空 `itemNavIds`（工作階段 022 已做）；新增 `app/closet/item/[id].tsx`「使用該單品的穿搭」照片牆連到穿搭詳細頁的入口清空 `outfitNavIds`
  - 因為這次是同一套機制的延伸，沒有另開新 feature，改成擴大 `feature_list.json` 的 `items-002` 範圍（標題與 user_visible_behavior 都改成同時涵蓋單品/穿搭兩種詳細頁），維持只有一個 `in_progress`
  - `src/__tests__/stores/uiStore.test.ts` 新增 `itemNavIds`/`outfitNavIds` 初始狀態與 setter 的測試（工作階段 022 當時漏補這塊）
  - 本機建置 Android release APK 並上傳 Google Drive 供使用者實機測試（單品與穿搭的滑動切換都在同一份 build 裡）
- 執行過的驗證：`pnpm test`（23 suites、330 tests 全過，含新增 3 項 uiStore 測試）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：跟工作階段 022 一樣，**穿搭詳細頁的滑動切換本身還沒有經過任何手指互動驗證**，只做過型別檢查＋單元測試＋建置成功；單品詳細頁部分的滑動切換也還在等使用者用這次新建的 APK 實機確認
- 下一步最佳動作：等使用者用新 APK 實機測試「單品詳細頁」與「穿搭詳細頁」的左右滑動切換後回報，皆確認正常再把 `items-002` 補齊 evidence 並改成 `passing`

### 工作階段 022

- 日期：2026-08-10
- 本輪目標：使用者要求新增功能——在單品／照片／分類的上衣.裙裝.褲裝等小分類中點進單品詳細頁後，可左右滑動切換上一筆/下一筆單品
- 已完成：
  - 設計決策：滑動用的「當下清單順序」改用 Zustand（`src/stores/uiStore.ts` 新增 `itemNavIds`/`setItemNavIds`）傳遞，不塞進網址 query，避免清單很長時網址過長
  - `app/closet/(tabs)/index.tsx`（單品分頁）、`app/closet/(tabs)/photos.tsx`（照片分頁）、`app/closet/category/[name].tsx`（分類詳細頁，單品/照片兩個子分頁依 `activeTab` 各自取對應清單）的 `handlePress` 在 `router.push` 進單品詳細頁前，都會把當下畫面實際可見（含搜尋/排序後）的清單順序寫入 `itemNavIds`
  - `app/closet/(tabs)/ranking.tsx`（排行榜）、`app/outfits/[id].tsx`（穿搭詳細頁的關聯單品）這兩個不在本次需求範圍內的入口，改成點進單品前把 `itemNavIds` 清空，避免沿用前一個畫面殘留的清單造成滑動結果對不上
  - `app/closet/item/[id].tsx`：新增 `src/utils/itemNav.ts` 的 `getNeighborIds(ids, currentId)` 純函式算出上一筆/下一筆 id；用 `react-native-gesture-handler` 的 `Gesture.Pan()`（`activeOffsetX([-10,10])`／`failOffsetY([-10,10])`，跟既有 `PhotoCarousel.tsx` 同一套閾值寫法）包住「照片輪播以外」的區域（單品標題卡、詳細列、穿搭紀錄區、編輯/刪除按鈕），滑動距離超過螢幕寬度 25% 且存在對應的上一筆/下一筆時用 `router.replace` 切換（用 replace 而不是 push，這樣返回鍵能一次回到清單，不會逐筆單品往回退）
  - 刻意把新手勢包在 `PhotoCarousel` 以外、而不是包住整個畫面：`PhotoCarousel` 本身已經有自己的左右滑動手勢（用來切換單品照片），兩個水平 Pan 手勢如果重疊在同一塊畫面區域，沒有額外設定優先權關係（`requireExternalGestureToFail` 之類）容易搶手勢/誤觸；用「兩個手勢區域完全不重疊」這個結構上的方式繞開整個衝突問題，不需要額外的手勢優先權工程
  - 新增 `src/__tests__/utils/itemNav.test.ts`（6 項測試，涵蓋中間/頭/尾/單筆/找不到/空清單）
- 執行過的驗證：`pnpm test`（23 suites、327 tests 全過，含新增 6 項）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）
- 已知風險或未解決問題：**本次改動只做過靜態檢查（型別＋單元測試），完全沒有做過模擬器或實機的手指滑動互動驗證**——尤其是「照片輪播區域的滑動仍然只切換照片、不會誤觸切換單品」這件事，理論上因為兩個手勢區域不重疊所以不會有衝突，但沒有實際滑過確認觸感/門檻（25% 螢幕寬）是否符合預期；另外 `router.replace` 切換單品後 ScrollView 是否正確捲回頂端、`outfitPage` 分頁狀態是否正確歸零，也還沒有實際操作驗證，只是根據既有的路由/元件行為推論
- 下一步最佳動作：請使用者選擇驗證方式（`pnpm start` 用 Expo Go/dev client 現場滑、或推一次 EAS Update OTA 到現有 TestFlight build、或重新建一份 Android APK），實際滑動測試通過後把 `items-002` 補齊 evidence 並改成 `passing`

### 工作階段 021

- 日期：2026-08-10
- 本輪目標：使用者實機測試 items-001（使用次數欄位）後回報：編輯單品修改使用次數後，單品詳細頁的「使用次數」與「平均使用價格」沒有跟著變
- 已完成：
  - 排查發現這個 App 一直有兩條平行的使用次數資料來源：(1) `items.usage_count` 欄位——`ItemCard.tsx`（列表）與編輯表單都讀這個，新增/刪除穿搭時同步 +1/-1；(2) `item_usage_logs` 表的逐筆使用記錄——`app/closet/item/[id].tsx`（單品詳細頁）原本改讀這張表的 `COUNT(*)` 來顯示「使用次數」並計算「平均使用價格」，這條資料原本是給 `useRanking.ts` 的「本月/本週」期間排行用的
  - 手動編輯 `usage_count`（items-001 新增的功能）只會動到來源 (1)，完全不影響來源 (2)，所以單品詳細頁沒反應
  - 修法：`app/closet/item/[id].tsx` 拿掉原本對 `item_usage_logs` 的 `COUNT(*)` 查詢與 `logUsageCount` state，「使用次數」「平均使用價格」改直接讀 `item.usageCount`，跟列表/編輯表單統一同一個資料來源；`item_usage_logs` 表本身沒有動，`useRanking.ts` 的期間排行仍照舊依賴它
  - 更新 `feature_list.json` 的 `items-001`：補上這次的根因、修法、evidence
  - 重新本機建置 Android release APK 並上傳 Google Drive
- 執行過的驗證：`pnpm test`（22 suites、321 tests 全過，無新增/新壞測試）；`npx tsc --noEmit`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：這次的詳細頁修復本身還沒經過使用者實機互動驗證（只做了型別檢查＋既有測試＋建置成功），需要使用者用新 APK 確認編輯使用次數後詳細頁數字真的會跟著變
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260810-1314.apk）實機測試後回報

### 工作階段 020

- 日期：2026-08-10
- 本輪目標：使用者要求在「我的衣櫃」單品的新增/編輯表單開放手動設定使用次數
- 已完成：
  - `app/closet/item/form.tsx`：新增 `usageCountText` 狀態，取代原本的 `existingUsageCount`（原本編輯模式會預填但畫面上沒有欄位可改，新增模式一律寫死 0）
  - 在價格/尺寸區塊新增「使用次數」TextInput（`number-pad`，`onChangeText` 過濾非數字字元）；編輯模式從 `item.usageCount` 預填，新增模式預設 `'0'`
  - `handleSave` 儲存時 `parseInt` 後用 `Math.max(0, ...)` 防止負數/NaN，兩種模式（新增/編輯）共用同一段解析邏輯，取代原本 `isEdit ? existingUsageCount : 0` 的分支
  - 新增 `feature_list.json` 的 `items-001`
  - 本機建置 Android release APK 並上傳 Google Drive 供使用者實機測試
- 執行過的驗證：`pnpm test`（22 suites、321 tests 全過，無新增/新壞測試）；`npx tsc --noEmit`（無新增型別錯誤，既有 outfits/form.tsx Photo/createdAt 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過靜態檢查（型別＋既有測試）與建置成功，**未做模擬器/實機互動截圖驗證**這個新欄位在畫面上實際顯示與操作是否符合預期；欄位目前沒有上限（例如允許輸入超大數字），使用者若沒有特別要求就先不加限制
- 下一步最佳動作：等使用者用新 APK 實機測試「使用次數」欄位後回報是否符合預期

### 工作階段 019

- 日期：2026-08-10
- 本輪目標：修使用者回報的 bug——新增穿搭後發現寫錯而刪除，關聯單品的使用次數沒有跟著降回去
- 已完成：
  - 用 systematic-debugging 排查根因：`app/outfits/form.tsx` 新增穿搭時會呼叫 `incrementUsageCount()` + `logItemUsages()` 幫每個關聯單品 +1，但 `src/services/outfitService.ts` 的 `deleteOutfit()` 只單純 `DELETE FROM outfits`，從未反向處理過 `usage_count` 欄位或 `item_usage_logs` 表，兩個刪除入口（單筆刪除 `app/outfits/[id].tsx`、多選刪除 `app/outfits/index.tsx` → `useOutfits.removeOutfit`）都共用這個漏洞
  - 新增 `itemService.decrementUsageCount()`（`usage_count = MAX(usage_count - 1, 0)`，防止減成負數）
  - 新增 `usageLogService.removeItemUsages()`（依 item_id + logged_at + source 各刪除一筆對應 log；`item_usage_logs` 沒有 outfit_id 外鍵，log 列彼此可互換，不需要改 schema）
  - `outfitService.deleteOutfit()` 改成刪除前先查出該筆 outfit 的 itemIds/date，呼叫上述兩個函式把之前 +1 的動作對稱地 -1
  - 新增回歸測試：`outfitService.test.ts`（deleteOutfit 3 項新測試）、`itemService.test.ts`（decrementUsageCount 1 項新測試）
  - 新增 feature_list.json 的 `ios-009`，記錄根因與範圍（只涵蓋「新增後刪除」；編輯穿搭時增減關聯單品目前仍不調整使用次數，是另一個未回報的缺口，本輪未動）
- 執行過的驗證：`pnpm test`（22 suites、321 tests 全過，含新增 4 項測試）；`npx tsc --noEmit`（無新增型別錯誤，既有 outfits/form.tsx Photo/createdAt 錯誤與本次改動無關，改動前後皆存在，已用 git stash 比對確認非本次引入）
- 已知風險或未解決問題：編輯穿搭時新增/移除關聯單品不會調整使用次數（不在本次回報範圍內，已記錄在 ios-009 notes，之後如有人回報再處理）
- 下一步最佳動作：無明確待辦；若使用者要求可比照本次修法檢查編輯穿搭的使用次數同步問題

### 工作階段 018

- 日期：2026-08-01
- 本輪目標：RevenueCat 官方事故排除後重測，修好順便發現的真實 bug
- 已完成：
  - 確認 RevenueCat 官方狀態頁（`status.revenuecat.com`）「新建立 App 的 Bundle ID 驗證錯誤」問題已於 7/31 06:30 UTC 解決
  - 實機重測「升級 Pro」，發現：直接在設定頁點主按鈕正常，但**從鎖定功能（例如某個 Pro 專屬 toggle）跳出的升級提示裡點「升級 Pro」卻沒反應**——排查後確認是 `useProGate.ts` 原本設計成「導到 /settings 頁」，但使用者觸發時通常已經身處設定頁，導頁動作沒有可見效果
  - 修正：`useProGate.ts` 的「升級 Pro」按鈕改成直接呼叫 `purchasePro()` 觸發真實購買（不管在哪裡觸發都一樣行為），成功後呼叫 `setProUnlocked(true)` 並顯示「升級成功」，失敗則顯示「升級失敗」＋錯誤訊息（跟設定頁主按鈕的 `handlePurchase` 邏輯一致）
  - 更新 `src/__tests__/hooks/useProGate.test.ts` 對應新行為
- 執行過的驗證：`npx tsc --noEmit`（無新增錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`npx jest`（22 suites、317 tests 全過）；實機互動測試確認修好
- 已知風險或未解決問題：無
- 下一步最佳動作：把同一個修正複製到 SPARKPLATE/SPARKFIT/SPARKLOG/SPARKSHAPE（這 4 個 App 是同一套 `useProGate.ts` 範本複製出來的，同樣的 bug）

### 工作階段 017

- 日期：2026-07-27
- 本輪目標：實機建置驗證 AdMob／RevenueCat 是否真的生效
- 已完成：
  - Xcode 登入 Apple ID、產生本機簽名憑證、開發者模式開啟、Provisioning Profile 產生（過程細節見 monetization_spec_5_apps 記憶「實機建置踩過的坑」）
  - `npx expo run:ios --device "iPhone 17 - K"` 成功建置並安裝到實機
  - 實機驗證：「設定 → 升級 Pro」跳出真的的蘋果購買確認畫面（不是舊的錯誤訊息），證明 RevenueCat／App Store 訂閱串接正確
- 執行過的驗證：實機互動測試（如上）
- 已知風險或未解決問題：廣告目前實機沒顯示（AdMob 帳號審核狀態「需審核」，推測是正常現象非程式碼問題，之後帳號審核通過再確認一次）；曾在瀏覽單品列表時無預期跳出「[RevenueCat] Purchase was cancelled」提示，原因不明、非使用者主動觸發，之後如果重現要再深入查
- 下一步最佳動作：把同一套實機驗證流程複製到 SPARKPLATE/SPARKFIT/SPARKLOG/SPARKSHAPE

### 工作階段 016

- 日期：2026-07-27
- 本輪目標：完整設定 RevenueCat（帳號、App、Entitlement、Offering/Package），把正式 Public API Key 換進程式碼
- 已完成：
  - App Store Connect 產生 In-App Purchase Key（P8 檔案，5 個 App 共用同一組：Key ID `XLCX2BBUZB`、Issuer ID `26d21cac-4b89-4016-8377-b905fc5773f6`）
  - RevenueCat 建立 SPARKWEAR 專屬 Project + App（Bundle ID `com.sparkwear.app`，上傳 P8 金鑰），拿到 Public API Key `appl_ttgLTAxglmgfHIzKKHjJGXkJoRN`
  - 建立 `pro` entitlement，接上 `com.sparkwear.app.pro.monthly`／`.pro.yearly` 兩個 App Store 商品
  - `default` offering 的 `monthly pro`／`yearly pro` 兩個 package 各自接上對應的 App Store 商品（過程中發現 RevenueCat onboarding 精靈會自動生一堆 Test Store 示範資料，容易搞混，處理方式已記錄進 monetization_spec_5_apps 記憶）
  - `src/constants/monetization.ts` 的 `REVENUECAT_API_KEY`（iOS 分支）換成正式 Key
- 執行過的驗證：`npx tsc --noEmit`（無新增錯誤）；`npx jest src/__tests__/hooks/useIsPro.test.ts src/__tests__/services`（12 suites、158 tests 全過）
- 已知風險或未解決問題：這個改動屬於 App 啟動時初始化用的 Key（純 JS 常數），理論上 `eas update` OTA 就能推送生效，不像 AdMob App ID 那樣需要重新原生 build——但目前還沒有實機/模擬器驗證過真實購買流程是否真的能跑通（RevenueCat 那邊商品狀態一直顯示「Could not check」，RevenueCat 官方回報是他們自己那邊連線 Apple 服務有已知事故，不是我們設定錯誤，但也代表還沒有實測證據）
- 下一步最佳動作：複製同一套 RevenueCat 設定流程到 SPARKPLATE/SPARKFIT/SPARKLOG/SPARKSHAPE（P8/Key ID/Issuer ID 沿用同一組，只是各自建立新 App/Entitlement/Offering）；5 個都做完後找時間排一次原生 build，實機測試真實購買/恢復購買流程

### 工作階段 015

- 日期：2026-07-23
- 本輪目標：使用者在 AdMob 後台建好橫幅廣告單元，把測試版位換成正式的
- 已完成：`src/constants/monetization.ts` 的 `BANNER_AD_UNIT_ID` 改成 `Platform.select`，iOS 用正式 ID `ca-app-pub-8914492142878610/8955226946`，Android 維持 `TestIds.BANNER`（AdBanner 在 Android 永遠不渲染，不需要真的版位）
- 執行過的驗證：`npx tsc --noEmit`（無新增錯誤）；`npx jest`（22 suites、316 tests 全過）
- 已知風險或未解決問題：跟上一輪的 App ID 一樣，這組真實廣告 ID 只有等下次原生 build（`expo prebuild`/EAS build）才會真正生效，目前模擬器上還是看得到測試廣告（因為還在跑上一次 build 的產物）；AdMob 應用程式狀態目前是「需審核」，正式廣告可能要審核通過才會有正常填充率
- 下一步最佳動作：找時間跑一次原生 build 讓新 App ID／廣告單元 ID 生效；之後設定 RevenueCat

### 工作階段 014

- 日期：2026-07-23
- 本輪目標：使用者申請好真實 AdMob 帳號，把 iOS App ID 換成正式的
- 已完成：`app.json` config plugin 的 `iosAppId` 換成 `ca-app-pub-8914492142878610~7753825917`；`androidAppId` 維持 Google 官方測試 ID（Android 一律視為 Pro，`AdBanner` 永遠不會渲染，不需要申請真的 Android 廣告版位）
- 執行過的驗證：`python3 -c "json.load(...)"` 確認 app.json 仍是合法 JSON
- 已知風險或未解決問題：這個改動屬於原生設定（會寫入 iOS Info.plist 的 GADApplicationIdentifier），純 JS 的 `eas update` OTA 推不動，需要重新 `expo prebuild`/整套 build 才會生效；廣告單元 ID（`BANNER_AD_UNIT_ID`）還沒換，目前仍是 Google 測試版位，待使用者在 AdMob 後台建立橫幅版位後提供
- 下一步最佳動作：收到廣告單元 ID 後更新 `src/constants/monetization.ts`；之後找時間跑一次原生 build 讓新 App ID 生效

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
