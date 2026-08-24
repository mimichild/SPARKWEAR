# 進度日誌

<!-- 寫法與完整範例見 docs/harness/PLAYBOOK.md §5。
     規則：新的工作階段記錄插在「## 工作階段日誌」標題正下方（最新在最上面），編號遞增。
     「目前已驗證狀態」每次收尾都要更新，永遠反映最新事實。 -->

## 目前已驗證狀態

- 儲存庫根目錄：/Users/mimi/Documents/SPARKWEAR
- 標準啟動路徑：`RUN_START_COMMAND=1 ./init.sh`（pnpm start = expo start；Android 實機建置用 /build-apk skill）
- 標準驗證路徑：`./init.sh`（pnpm install + pnpm test；2026-08-10 為 334 tests passed；另有 pnpm typecheck、pnpm regression）
- 目前最高優先級未完成功能：ranking-001（排行頁新增分類篩選 chip 列＋新增「未使用天數」指標）——程式碼完成、自動化驗證通過、APK 已建置上傳（sparkwear-v2.0.0-20260824-1817.apk），等待使用者實機互動確認後才能改成 passing。這個指標的資料修復走過五輪：工作階段 030 修好「手動改使用次數」欄位往後新產生的補插紀錄日期（改成用編輯當下日期）；工作階段 031/032 用兩個 db migration（v4→v5／v5→v6）嘗試修復舊資料，啟發式方法在裝置一次跑完多個 migration 時失效，兩次修復疊加後讓資料忽早忽晚、彼此矛盾；工作階段 033 放棄啟發式猜測，改用架構性修正——把 reconcileUsageLogs() 補插紀錄的來源標籤從語意混用的 'manual' 拆成新的 'count-sync'（沒有日期依據）跟 'manual-log'（手動登錄穿搭紀錄，有真實日期），getLastUsedDates() 只信任 'outfit'／'manual-log' 這兩種有真實日期依據的來源；工作階段 034 找到真正的根本原因（跟前四輪完全不同層級）——reconcileUsageLogs() 的刪除邏輯沒有限制只能刪沒有真實日期依據的來源，導致手動把使用次數改低時可能刪到真正對應「新增穿搭」的 outfit 紀錄，這個 bug 從工作階段 026 就存在、不是這幾輪 migration 造成的新問題。修法：(1) DELETE 子句加上來源限制，outfit／manual-log 永遠不會被刪除，寧可筆數對不齊也不犧牲真實紀錄；(2) db v6→v7 migration（reseedMissingOutfitLogs）用 outfits 表（唯一可信的真相來源）補回過去被誤刪的 outfit 紀錄，已存在的跳過不重複計數。**殘留限制**：只靠「編輯單品→手動改使用次數」（沒有日期欄位）累積的使用紀錄，未使用天數只能保守地從購買日期／加入衣櫃日期起算；要精確請優先用「新增穿搭」或「手動登錄穿搭紀錄」（詳見 feature_list.json ranking-001 notes）
- 其餘功能：monetization-001、ios-009、items-001、items-002（單品詳細頁／穿搭詳細頁左右滑動切換上一筆/下一筆項目）皆已 passing；items-002 已由使用者實機安裝 sparkwear-v2.0.0-20260810-1352.apk 測試「滑動測試沒問題」；AdMob／App Store 訂閱項目／RevenueCat 三塊監利化基礎設施全部完成並**已實機驗證通過**；`useProGate.ts` 修好一個真實 bug（鎖定功能跳出的升級提示，按「升級 Pro」改成直接觸發購買，不再導頁——導頁設計在使用者已身處設定頁時會看起來沒反應）；廣告目前還沒顯示（AdMob 帳號審核中，正常現象）；2026-08-10 修好「刪除穿搭紀錄後單品使用次數未跟著減少」的 bug（ios-009）；2026-08-10 新增單品新增/編輯表單的「使用次數」手動輸入欄並修好單品詳細頁沒同步更新的問題（items-001，使用者已實機驗證新增/編輯操作正常）；2026-08-10 再修好一個同源問題：手動改使用次數後「排行」頁的使用次數排行沒反映新數字（items-001 notes 補記，見下方工作階段 026），已建置新 APK 等使用者實機確認
- 2026-08-10 純導頁調整：編輯單品儲存後改成停留在該單品詳細頁（原本會跳回衣櫃首頁），`app/closet/item/form.tsx` 用跟「取消」按鈕一樣的 `router.dismiss()` 邏輯；新增單品的導頁行為不變。已建置 APK 等使用者實機確認
- 2026-08-10 補上一個已知缺口：備份/還原（backupService.ts）現在會把 item_usage_logs 表一併納入匯出/匯入，還原備份後排行頁的期間統計（本月/本季/本年最常穿）不再是空的；細節見工作階段 028。**這塊只做過自動化檢查，尚未經過使用者實機「匯出→還原」完整驗證**，且匯入覆蓋模式本身就是會清空現有資料再寫入的動作，使用者實測前務必先自行確認裝置上沒有還沒備份過的重要資料
- 目前 blocker：無
- 背景：Apple Developer Program 已生效（2026-07-20）；ios-001～ios-008 皆已 passing（含實機驗證相機拍照）；EAS 雲端建置成功產出 .ipa；已設定 EAS Update（OTA）支援，之後純 JS/TS 改動可以用 eas update 直接推送不用整套重 build；eas.json 加了 ascAppId，eas submit 可以完全非互動執行；SPARKWEAR 的匯入是走 SQL INSERT（非檔案覆蓋），確認沒有 SPARKPLATE 那種匯入唯讀 bug 的風險；行動計畫見 docs/IOS_READINESS_ROADMAP.md。2026-07-23 起開始做付費功能：安裝 react-native-google-mobile-ads + react-native-purchases，新增 src/constants/monetization.ts（目前用 Google 測試 ID + 空字串佔位 RevenueCat Key）、src/services/purchases.ts、src/hooks/useProGate.ts（未通過 Pro 鎖時跳升級提示）、src/hooks/useIsPro.ts（Android 因無付費入口一律視為 Pro，iOS 才看真實訂閱狀態）、src/components/AdBanner.tsx；VIP 兌換碼機制已依使用者指示完全移除，PRO 解鎖區塊改成「升級 Pro」／「恢復購買」按鈕。

## 工作階段日誌

### 工作階段 034

- 日期：2026-08-24
- 本輪目標：使用者安裝工作階段 033 的 APK 後回報第四個問題——有些單品明明是從「新增穿搭」增加使用次數的，未使用天數卻按照購買日期算，不是真實使用日期
- 已完成：
  - 排查找到跟前三輪完全不同層級的真正根因：`src/services/usageLogService.ts` 的 `reconcileUsageLogs()`（手動把使用次數改低時觸發，需要刪除多餘的 `item_usage_logs` 紀錄讓筆數對齊）雖然用 `ORDER BY CASE` 排了刪除優先順序（優先刪 count-sync，其次 migration），但 `WHERE` 子句沒有限制只能刪這些沒有真實日期依據的來源——一旦某件單品沒有足夠的 count-sync/migration/manual 紀錄可刪（例如次數幾乎全部來自真實的新增穿搭），SQL 的 `ORDER BY ... LIMIT` 會繼續刪到 outfit 來源的紀錄，讓那件單品永久失去真實的穿搭使用紀錄，之後未使用天數自然 fallback 回購買日期
  - 確認這個 bug 從工作階段 026 新增 `reconcileUsageLogs()` 時就存在，不是這幾輪「未使用天數」相關 migration 造成的新問題，只是這次新增這個指標、需要精確的「最後使用日期」，才第一次讓這個既有缺陷的影響被注意到（過去「使用次數」只看 COUNT(*)，被刪掉幾筆 outfit log 換成幾筆 count-sync log，總數還是對的，感覺不出來哪裡不對）
  - 修法分兩部分：
    - (1) 從根本堵住漏洞：`reconcileUsageLogs()` 的 `DELETE` 子句加上 `source IN ('count-sync', 'migration', 'manual')` 限制，讓 outfit／manual-log 這兩種有真實日期依據的紀錄從此完全不可能被這個函式刪除；即使可刪除的數量不夠補滿目標差額，也只刪到能刪的上限為止——寧可讓 log 筆數跟 usage_count 對不齊，也不能為了湊數字犧牲真實的穿搭歷史紀錄（資料真實性 > 數字對齊，刻意的優先順序取捨）
    - (2) 修復過去已經被誤刪的資料：新增 `reseedMissingOutfitLogs(db)`，機制上完全不靠猜測——`outfits` 表本身就是「使用者實際新增過哪些穿搭、哪天、關聯哪些單品」的唯一真相來源（跟 v2→v3 migration 當初從這張表補種歷史紀錄的邏輯完全相同），對每筆真實存在的 outfit 紀錄逐一檢查其每個關聯單品，那件單品在那個日期還沒有對應 outfit log 就補插回去，已存在的（不管是最初就寫入的還是 v2→v3 seed migration 建立的）一律跳過，不會讓「使用次數」排行被灌水
    - 接到 db migration 機制當 v6→v7，使用者安裝新版後下次啟動自動套用；範圍限制：只能救回「真實 outfit 紀錄還在、只是對應的 log 被刪掉」這種情況，如果使用者曾經把穿搭紀錄本身也一併刪除了，那筆歷史無法復原（outfits 表本身沒有資料可依循）
  - 新增測試：`src/__tests__/services/usageLogService.test.ts` 的 `reseedMissingOutfitLogs`（3 項：補插缺漏紀錄並回傳筆數、已存在的跳過不重複插入、沒有穿搭紀錄時回傳 0）、`reconcileUsageLogs` 新增 1 項回歸測試明確驗證 DELETE 的 WHERE 子句排除 outfit／manual-log
  - 更新 feature_list.json 的 ranking-001 evidence／notes，完整記錄這輪排查與修法
  - 重新本機建置 Android release APK（sparkwear-v2.0.0-20260824-1817.apk）並上傳 Google Drive
- 執行過的驗證：`pnpm test`（24 suites、367 tests 全過，含新增 4 項）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過自動化檢查與建置成功，**尚未經過使用者實機驗證這次的修復是否真的讓透過「新增穿搭」累積使用次數的單品，未使用天數正確反映真實日期**；也還沒驗證「使用次數」排行沒有因為 reseed 補插而出現重複計數；如果使用者發現還有單品的 outfit 紀錄救不回來，很可能是連穿搭紀錄本身都被刪除過，屬於已知範圍限制不是新 bug
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260824-1817.apk）實機確認：(1) 先前回報「明明是新增穿搭卻按購買日期算」的那些單品，這次是否變成正確的真實使用日期 (2) 使用次數排行的數字沒有變化（沒有重複計數）(3) 連同前幾輪的分類篩選是否都正常；全部確認正常再把 ranking-001 補齊 evidence 並改成 passing

### 工作階段 033

- 日期：2026-08-24
- 本輪目標：使用者安裝工作階段 032 的 APK 後回報比之前更混亂的狀況——完全沒使用過的單品顯示「10天前使用過」，30天前才用過的單品卻顯示「69天未使用」
- 已完成：
  - 排查確認這證實了前兩輪（031/032）的路線已經走到極限：v5→v6 賴以判斷「哪些紀錄被 v4→v5 誤改」的訊號（logged_at 是否晚於自身 created_at），在裝置一次跑完 v4→v5＋v5→v6（例如全新安裝、或這幾輪測試中曾經整批一起跑）時會失效——因為 v3→v4 建立紀錄的 created_at、跟 v4→v5 緊接著改寫的 logged_at，出自同一次 migration run 的同一個時間點，兩者日期相同，訊號消失，v5→v6 因此漏抓，兩個修復疊加後讓資料變得更混亂
  - 決定不再繼續用第四個 migration 追著猜歷史日期，改採架構性修正，從根本解決「同一個來源標籤代表兩種不同語意」這個問題：
    - `src/services/usageLogService.ts` 的 `reconcileUsageLogs()` 補插紀錄的來源標籤從沿用已久的 `'manual'` 改成全新的 `'count-sync'`——這個標籤本身沒有日期輸入 UI、referenceDate 只是編輯當下的日期，不是真正的使用日期
    - `app/outfits/manual-log.tsx`（手動登錄穿搭紀錄畫面，使用者自己選日期）改用新的 `'manual-log'` 標籤，跟上面的 `'count-sync'` 明確區分開——這是這整個系列 bug 的根本原因：原本 `'manual'` 同時代表「沒有日期依據的次數同步」跟「使用者自己選的真實日期」兩種完全不同的東西
    - `getLastUsedDates()` 改成 `WHERE source IN ('outfit', 'manual-log')`，只信任這兩種有真實日期依據的來源；`'manual'`（舊資料殘留）／`'count-sync'`／`'migration'` 一律不讀，沒有真實日期依據的單品乾脆 fallback 回 `calcDaysUnused` 的購買日期／建立日期——刻意選擇「老實承認不知道」而不是「繼續猜一個可能錯的數字」
    - 刻意不再新增 migration 去修資料庫裡已經被 v4→v5/v5→v6 搞亂的 `logged_at` 值：新的查詢邏輯已經不會再讀到 `'manual'`／`'migration'` 來源的資料，那些被搞亂的舊值已經完全不影響「未使用天數」的計算結果，繼續修反而有再次弄巧成拙的風險；`repairStaleReconciledLogDates`／`revertOverAggressiveLogDateRepair` 兩個函式保留不動（已對外發布過的歷史 migration），只在註解補充「已不影響未使用天數」
  - 更新 `src/types/index.ts` 的 `UsageLog.source` 型別；更新測試：`usageLogService.test.ts` 的 `getLastUsedDates` 補查詢條件測試、`reconcileUsageLogs` 兩項測試斷言改成 `'count-sync'`／新的 CASE 優先順序；`itemService.test.ts` 同步更新斷言
  - 更新 feature_list.json 的 ranking-001 evidence／notes，完整記錄這輪排查、架構修正、以及一個使用者需要知道的殘留限制
  - 重新本機建置 Android release APK（sparkwear-v2.0.0-20260824-1806.apk）並上傳 Google Drive
- 執行過的驗證：`pnpm test`（24 suites、363 tests 全過）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過自動化檢查與建置成功，**尚未經過使用者實機驗證這次的架構修正是否真的讓天數不再忽早忽晚**；**有一個使用者需要知道的殘留限制**：只靠「編輯單品→手動改使用次數」（沒有日期欄位）累積的使用紀錄，未使用天數只能保守地從購買日期／加入衣櫃日期起算，不是使用者記憶中真正最後一次穿的日期——這不是 bug，是資料本身沒有記錄那個日期；要精確，之後穿搭時建議優先用「新增穿搭」或「手動登錄穿搭紀錄」（兩者都有日期選擇），「手動改使用次數」適合用來做總數校正，不適合當成日期依據
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260824-1806.apk）實機確認：(1) 先前回報的兩個矛盾案例（沒用過卻顯示 10 天前、30 天前用過卻顯示 69 天）這次是否變得合理 (2) 有真實新增穿搭／手動登錄穿搭紀錄的單品天數是否正確 (3) 連同前幾輪的分類篩選是否都正常；如果使用者理解並接受上述殘留限制、且三項都確認正常，再把 ranking-001 補齊 evidence 並改成 passing；如果還有第三種方向的異常，代表要認真考慮改成「未知」顯示而不是繼續猜測日期

### 工作階段 032

- 日期：2026-08-24
- 本輪目標：使用者安裝工作階段 031 的 APK 後回報反方向的異常——有些單品完全沒有手動改過使用次數、最近也沒穿，未使用天數卻只有 8-9 天
- 已完成：
  - 排查確認是工作階段 031 那次一次性修復（`repairStaleReconciledLogDates`）本身的假設錯誤：它把 `items.updated_at`（單品最後編輯時間）當成「最後使用時間」的估計值，但 `updated_at` 只要編輯單品的任何欄位（不只是使用次數，例如改價格/備註/照片，或這幾週測試其他功能時順手存過檔）就會更新，導致完全沒有最近使用的單品被誤判成「最近使用」——這正是詢問使用者要不要做這個修復時，preview 裡已經預告過的風險（「不保證 100% 精確，因為也可能是改別的欄位才觸發存檔」），這次真的發生了
  - 排查發現：`items.updated_at` 本身不帶「這次編輯改了什麼」的資訊，沒辦法單從現在的資料庫狀態分辨「當初 v4→v5 誤改的紀錄」跟「之後真的因為手動改次數、用修復後新邏輯正確產生的今天日期紀錄」；但找到一個可靠的間接訊號：`item_usage_logs` 每筆紀錄都有 `created_at`（紀錄被寫進資料庫的時間）與 `logged_at`（紀錄代表的使用日期）兩個欄位，正常寫入的紀錄 `logged_at` 不可能晚於 `created_at`（沒有人會「先把紀錄存進資料庫，事後才把它改成更晚的日期」，除了 v4→v5 這次修復本身就是在做這件事）——`logged_at > created_at` 是只有被 v4→v5 動過手腳的紀錄才會出現的矛盾狀態，精準且不會誤傷之後正確新建的紀錄
  - `src/services/usageLogService.ts` 新增 `revertOverAggressiveLogDateRepair(db)`：找出 `source IN ('manual','migration')` 且 `logged_at` 等於單品 `updated_at` 日期部分、且 `logged_at` 晚於自己 `created_at` 日期部分的紀錄，改回 `COALESCE(購買日期, 建立日期)`——回到 v4→v5 修復之前更保守但誠實的估計值，理由是「未使用天數」功能的用途就是幫使用者找出被冷落的單品，錯誤地把真正被冷落的單品排除在外（顯示成最近使用），比顯示保守的大數字傷害更大
  - `src/db/index.ts` 的 `runMigrations()` 新增 `current < 6` 區塊，接到既有 migration 機制當 v5→v6；還沒升級過、要一次從 v3 或更早版本跳上來的裝置，v4→v5 跟 v5→v6 會在同一次 `initDatabase()` 呼叫中依序執行，等於「先誤改、緊接著馬上修正」，結果正確，只是多做一點虛功
  - `repairStaleReconciledLogDates`（v4→v5 那個函式本身）刻意保留不動，只在註解補充「已知問題，下面 v5→v6 會修正」——它是已經對外發布過的一次性 migration 歷史記錄，改寫它的行為對已經跑過的裝置沒有意義，且會讓「這個版本的 App 到底做了什麼」的紀錄失真
  - 新增測試：`src/__tests__/services/usageLogService.test.ts` 的 `revertOverAggressiveLogDateRepair`（4 項：有購買日期時改回購買日期、沒有購買日期時 fallback 建立日期、沒有符合條件的紀錄時不做任何事、SQL 條件正確鎖定矛盾訊號）
  - 更新 feature_list.json 的 ranking-001 evidence／notes，完整記錄這輪排查與修法，並補上「如果之後還有第三種方向異常，這套回推歷史日期的做法可能已到極限」的提醒
  - 重新本機建置 Android release APK（sparkwear-v2.0.0-20260824-1752.apk）並上傳 Google Drive
- 執行過的驗證：`pnpm test`（24 suites、362 tests 全過，含新增 4 項）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過自動化檢查與建置成功，**尚未經過使用者實機驗證這次的修正是否真的讓那些被誤判成「最近使用」的單品變回合理天數**，也還沒驗證會不會有第三種方向的異常；「用資料庫既有欄位回推歷史使用日期」這整套做法本質上是啟發式猜測，不是精確資料，如果之後還持續出現方向不同的異常，代表可能要考慮換成更根本的做法（例如對「只用手動改次數、沒有明確日期依據」的舊資料，畫面上明確標示「未知」而不是猜一個數字）而不是繼續加更多修正 migration
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260824-1752.apk）實機確認：(1) 先前回報「明明沒改過、沒穿過卻只有 8-9 天」的那件單品，現在天數是否變回合理的大數字 (2) 先前回報「前幾天才改過使用次數」的單品，天數是否仍然正確反映最近編輯的時間 (3) 連同工作階段 029/030 的「未使用天數」指標與分類篩選是否都正常；確認全部正常再把 ranking-001 補齊 evidence 並改成 passing

### 工作階段 031

- 日期：2026-08-24
- 本輪目標：使用者安裝工作階段 030 的 APK 後回報：前幾天才在編輯單品改過使用次數的單品，未使用天數還是一千多天
- 已完成：
  - 確認這不是新 bug，是時間點問題：那次編輯發生在工作階段 030 的修復之前，補插的紀錄用的還是舊邏輯（購買日期），工作階段 030 的收尾其實已經預告過這個限制（「這個修法只影響往後新產生的補插紀錄，不會回填修正既有舊資料」），使用者這次剛好踩到
  - 用 AskUserQuestion 詢問使用者要「寫一次性資料修復」還是「自己逐件重新改一次使用次數」，使用者選擇一次性修復
  - `src/services/usageLogService.ts` 新增 `repairStaleReconciledLogDates(db)`：SQL 找出 `item_usage_logs` 裡 `source IN ('manual','migration')` 且 `logged_at` 剛好等於 `COALESCE(items.purchase_date, substr(items.created_at,1,10))`（舊邏輯會用的 filler 值）、且該單品 `updated_at` 比這筆紀錄日期更新的紀錄，把 `logged_at` 改成該單品最後編輯時間的日期部分；只鎖定日期剛好等於 filler 值的紀錄，不會動到『新增穿搭』／『手動登錄穿搭紀錄』這些日期是使用者自己選的真實紀錄
  - `src/db/index.ts` 的 `runMigrations()` 新增 `current < 5` 區塊，呼叫 `repairStaleReconciledLogDates()` 後把 `PRAGMA user_version` 設成 5；接到既有的 v2→v3／v3→v4 同一套 migration 機制，使用者安裝新版 App 下次啟動時 `initDatabase()` 會自動套用，不需要使用者手動觸發或逐件重新編輯
  - 這是啟發式修正（用單品最後編輯時間當最佳估計值），不保證 100% 精確——例如使用者改完使用次數後又去改同一件單品的備註等其他欄位，`updated_at` 會反映到那次無關的編輯而不是真正改次數的那一刻，但兩者時間點通常很接近，這個取捨已經在詢問使用者時說明過並取得同意
  - 新增測試：`src/__tests__/services/usageLogService.test.ts` 的 `repairStaleReconciledLogDates`（3 項：正確更新符合條件的紀錄並回傳筆數、沒有符合條件的紀錄時不做任何事、SQL 條件正確鎖定 manual/migration 來源與 filler 日期比對）
  - 更新 feature_list.json 的 ranking-001 evidence／notes，記錄這次的排查與修法
  - 重新本機建置 Android release APK（sparkwear-v2.0.0-20260824-1737.apk）並上傳 Google Drive
- 執行過的驗證：`pnpm test`（24 suites、358 tests 全過，含新增 3 項）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過自動化檢查與建置成功，**尚未經過使用者實機驗證這個一次性修復是否真的讓那些卡在舊日期的單品變準**——需要使用者安裝新版 App、確認先前回報「前幾天改過但天數還是不對」的那件單品，這次未使用天數是否變成合理的小數字
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260824-1737.apk）實機確認舊資料修復生效、且連同工作階段 029/030 的「未使用天數」指標與分類篩選都正常後回報，確認全部正常再把 ranking-001 補齊 evidence 並改成 passing

### 工作階段 030

- 日期：2026-08-24
- 本輪目標：使用者實機測試工作階段 029 的「未使用天數」後回報：很多今年穿過的單品未使用天數卻高達上千天，懷疑計算只用了「新增穿搭」的紀錄，沒算到「手動登錄穿搭」或「手動改使用次數」
- 已完成：
  - 排查確認使用者的懷疑部分正確：「新增穿搭」（app/outfits/form.tsx）與「手動登錄穿搭紀錄」（app/outfits/manual-log.tsx）都有把使用者選的真實日期寫進 item_usage_logs，這兩者算出來的未使用天數沒問題；但「編輯單品→手動改使用次數」這個數字欄位本身沒有日期輸入 UI，背後呼叫的 `reconcileUsageLogs()`（工作階段 026 新增）原本用「單品購買日期」當補插紀錄的日期（刻意選擇，是為了避免一次把使用次數從 0 調高到大數字時，這些次數全部被算進『這個月』的使用次數排行、讓月/季統計失真）；副作用是只靠「手動改使用次數」欄位追蹤穿搭的單品，未使用天數永遠從購買日算起，即使剛手動 +1 也還是動輒上千天
  - 用 AskUserQuestion 詢問使用者三個修法選項（a. 補插紀錄改用『編輯當下』日期 b. 改用單品最後編輯時間 item.updatedAt 判斷 c. 維持現狀），因為這牽動既有月/季排行統計的既有取捨，不是單純 bug，需要使用者知情選擇；使用者選擇 (a)
  - `src/services/itemService.ts` 的 `saveItem()`／`updateItem()` 呼叫 `reconcileUsageLogs()` 的 `referenceDate` 參數，從「購買日期，沒有才退而求其次用今天」改成一律使用「今天（編輯當下）」
  - 更新 `src/__tests__/services/itemService.test.ts` 的『seeds item_usage_logs...』測試，斷言從寫死的購買日期字串改成動態算出的「今天」字串
  - 更新 feature_list.json 的 ranking-001 notes，記錄這次的根因排查、使用者選擇的修法、與已知殘留風險（見下）
  - 重新本機建置 Android release APK（sparkwear-v2.0.0-20260824-1726.apk）並上傳 Google Drive 供使用者實機重測
- 執行過的驗證：`pnpm test`（24 suites、355 tests 全過）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：**這次修法只影響往後新產生的補插紀錄，不會回填修正使用者裝置上已經存在的舊資料**——如果裝置上已經有大量「次數對但日期是舊購買日期」的既有 log（工作階段 029 build 之前就手動改過使用次數的單品都會有），這些單品在新邏輯生效後仍會顯示成上千天，要等使用者之後再次調整該單品的使用次數（觸發新的 reconcile）才會補上更準確的日期；沒有做退場的資料遷移，因為既有 'manual' 來源的 log 沒辦法可靠區分「這是真的手動登錄穿搭紀錄留下的真實日期」還是「這是舊版 reconcileUsageLogs 補插的購買日期」，貿然改寫舊資料風險比留著不動更高
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260824-1726.apk）實機確認「未使用天數」在新增穿搭／手動登錄穿搭紀錄／手動改使用次數（改動後才新產生的）這三種情境下都正確反映最近使用時間；順便讓使用者知道既有舊資料不會自動變準，需要的話可以之後討論是否要做一次性資料修正；確認正常再把 ranking-001（連同分類篩選一起）補齊 evidence 並改成 passing

### 工作階段 029

- 日期：2026-08-24
- 本輪目標：使用者要求在排行頁「使用次數」右邊新增一個「未使用天數」篩選/排序，預設最久沒穿的單品排最上面
- 已完成：
  - ranking-001（分類篩選）目前仍是 in_progress、還在等使用者實機確認，依鐵律同時只能有一個 in_progress 功能；這個新指標是同一個排行頁的相關功能，比照先前 items-002 擴大範圍的做法，直接併入 ranking-001，沒有另開新 feature
  - `src/services/usageLogService.ts` 新增 `getLastUsedDates(db)`，用 `SELECT item_id, MAX(logged_at) ... GROUP BY item_id` 取得每件單品最近一次使用日期
  - `src/hooks/useRanking.ts` 新增 `calcDaysUnused(item, lastUsedDate, now)` 純函式：有最近使用日期就用它算天數，完全沒使用過（沒有對應的 item_usage_logs）就 fallback 用 `item.purchaseDate`、再沒有就用 `item.createdAt`，這樣「買了從沒穿過」的單品天數通常會是清單裡最大的，自然排最上面，符合「最久沒穿的單品放最上面」的需求，不需要另外用 Infinity 特殊處理
  - `RankingMetric` 型別新增 `'days_unused'`；`sortByMetric()`／`itemToEntry()` 都新增對應 case，排序方向沿用既有「desc=數值高排前」的通用邏輯（跟 cp 指標不同，不需要反轉方向），「再點一下切換方向」的既有互動可以直接沿用
  - useRanking hook 的 Promise.all 加入 `getLastUsedDates(db)`，跟既有 items/voteCounts/colors 一起抓；因為這個指標沒有 usage/cp 那種「依區間統計次數」的特殊資料來源，直接落入 hook 既有處理『金額』指標的最後一個 else 分支（filterByPeriod → sortByMetric → itemToEntry），連帶會像『金額』一樣受『期間』選單影響（依購買日期篩選），這是沿用既有架構的自然結果，使用者沒特別要求排除期間篩選，先不特別處理
  - 畫面端只在 `app/closet/(tabs)/ranking.tsx` 的 `METRICS` 陣列裡『使用次數』後面插入『未使用天數』、`DEFAULT_DIRS` 補一個預設方向 `desc`，沒有動任何既有的分類篩選／期間篩選程式碼
  - 新增測試：`useRanking.test.ts` 的 `calcDaysUnused`（4 項：有使用紀錄、從沒使用過 fallback 購買日期、連購買日期都沒有 fallback 建立日期、防呆不回傳負數）與 `sortByMetric` 的 `days_unused` case（2 項：desc 最久沒穿排前、asc 最近穿過排前）；`usageLogService.test.ts` 的 `getLastUsedDates`（2 項）
  - 本機建置 Android release APK（sparkwear-v2.0.0-20260824-1707.apk）並上傳 Google Drive 供使用者實機測試
- 執行過的驗證：`pnpm test`（24 suites、355 tests 全過，含新增 8 項）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過自動化檢查與建置成功，**尚未經過使用者實機互動驗證**——需要使用者用新 APK 點選「未使用天數」指標，確認清單依天數正確排序（預設最久沒穿在最上面，再點一次切換成最近穿過的在最上面）；同時仍待回報的還有 ranking-001 原本的分類篩選部分（工作階段 025）
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260824-1707.apk）實機測試「未使用天數」指標與分類篩選皆正常後回報，確認正常再把 ranking-001 補齊 evidence 並改成 passing

### 工作階段 028

- 日期：2026-08-10
- 本輪目標：補上工作階段 026 排查時發現、使用者要求現在就處理的既有缺口——備份/還原沒有涵蓋 item_usage_logs 表，還原備份後排行頁的期間統計（本月/本季/本年最常穿）會是空的
- 已完成：
  - 確認根因細節：`src/services/backupService.ts` 的匯出（`exportBackup`）只讀 `items`/`outfits`/`categories`/`origins`/`colors`/`vote_counts` 六張表寫進備份 manifest；匯入（`importBackupFromUri`）的 `insertItems()` 也是直接對 `items` 表做原始 SQL INSERT，完全繞過 `itemService.saveItem`/`updateItem`，所以連工作階段 026 剛加的 `reconcileUsageLogs()` 自動同步都不會被觸發——`item_usage_logs` 表從頭到尾都沒被匯出/匯入邏輯碰過
  - `src/types/index.ts` 新增 `UsageLog` 型別（`id`/`itemId`/`loggedAt`/`source`/`createdAt`），`BackupManifest.data` 新增 `usageLogs: UsageLog[]` 欄位；因為是新增欄位，manifest 版本沒有升版（仍是 5），匯入時用 `manifest.data.usageLogs ?? []` 保底相容本次修復之前匯出的舊備份檔（那些檔案裡沒有這個欄位）
  - `src/services/usageLogService.ts` 新增 `getAllUsageLogs(db)`，把 `item_usage_logs` 整張表讀出來、欄位轉成 camelCase
  - `src/services/backupService.ts`：`exportBackup()` 呼叫 `getAllUsageLogs()` 把資料寫進 manifest；`importBackupFromUri()` 覆蓋模式的清空清單新增 `DELETE FROM item_usage_logs`；新增 `insertUsageLogs()`（不分合併/覆蓋模式都用 `INSERT OR IGNORE` by log id，跟 `insertItems`/`insertOutfits` 同一套「以 id 判斷是否已存在」邏輯，同一份備份重複匯入不會產生重複筆數；匯入前用匯入後的 `items` 表查一次有效 id 集合，略過參照到未匯入單品的孤兒 log，跟既有 `insertVoteCounts` 的作法一致）；v4→v5 舊格式轉換（`convertV4ToV5`）也補上 `usageLogs: []`（v4 格式沒有這個概念，沒資料可帶，滿足新的必要型別欄位）
  - 新增測試：`src/__tests__/services/usageLogService.test.ts` 補 2 項（`getAllUsageLogs` 欄位轉換、查無資料回傳空陣列）；`src/__tests__/services/backupService.test.ts` 補 1 項（`exportBackup` 有呼叫讀取 `item_usage_logs` 的 SQL）。`insertUsageLogs`／匯入端沒有新增單元測試——這個檔案原本就沒有任何測試涵蓋 `insertItems`/`insertOutfits`/`insertCategories` 這類匯入 DB 寫入的內部函式（牽涉 fflate 串流解壓縮＋mock 檔案系統，複雜度高，這個專案一直是靠實機做真的匯出/匯入來驗證這塊，不是單元測試），這次沿用同樣的既有慣例，不是漏補
  - 本機建置 Android release APK（sparkwear-v2.0.0-20260810-1756.apk）並上傳 Google Drive
- 執行過的驗證：`pnpm test`（24 suites、347 tests 全過，含新增 3 項）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：**這是這幾輪修復裡風險最高的一項，完全沒有經過使用者實機「匯出→匯入」的完整驗證**——只做過型別檢查、單元測試（涵蓋範圍不含實際匯入流程）與建置成功；匯入覆蓋模式本身是會先清空現有 items/outfits/item_usage_logs 等表再寫入的破壞性操作，使用者實測前要注意先備份現有真實資料再測，不要直接拿主力資料裸測；也還沒有驗證過「用本次修復前匯出的舊備份檔（沒有 usageLogs 欄位）」匯入時是否真的不會出錯（程式邏輯上用 `?? []` 保底，但沒有實機拿一份真的舊備份檔測過）
- 下一步最佳動作：這項需要使用者謹慎測試——建議用測試/非主力資料匯出一份新備份、清空或换一支裝置後匯入，確認匯入後排行頁「本月/本季」等期間統計不再是空的；驗證通過後才能視情況決定是否要開一個正式 feature_list 項目追蹤（目前先只記在這裡，沒有新增 feature_list 項目，也沒有動 ranking-001 的 in_progress 狀態）；同時仍待回報的還有工作階段 026（排行頁使用次數同步）、027（編輯後停留頁面）與 ranking-001（分類篩選）的實機測試結果
- 2026-08-10 使用者初步實測回報：用最新版 App（1756 build）重新匯出備份後匯入，排行頁「本月/本季」有顯示清單（不是空的），但每件單品使用次數都是 0；一開始以為是 bug，追問後確認備份檔確實是剛用新版重新匯出的（不是舊格式備份檔），使用者接著自行意識到「應該是因為八月還沒穿過那些單品」——8/10 當下「本月」區間本來就短，顯示 0 次合理，不是 restore 邏輯的問題。使用者判斷「目前應該是沒問題了」，但這只是使用者口頭初步確認，**還沒有拿一件確定近期穿過的單品實際核對數字是否正確**，嚴謹來說證據還不夠完整，之後如果要正式把這項改成 feature_list 的 passing，要再補一次「挑一件近期真的穿過的單品，核對本月/本季/全部數字都對得上」的驗證

### 工作階段 027

- 日期：2026-08-10
- 本輪目標：使用者要求「點入單品並編輯，按下儲存之後，畫面停留在單品中，不要跳回單品首頁」
- 已完成：
  - `app/closet/item/form.tsx` 的 `handleSave`：編輯模式（`isEdit && id`）儲存成功後，原本一律 `router.replace('/closet')` 跳回衣櫃首頁；改成跟既有「取消」按鈕同一套邏輯——`router.canDismiss?.() ? router.dismiss() : router.replace('/closet/item/${id}')`，因為這個表單本身是以 modal 形式從單品詳細頁 push 出來的（`app/closet/_layout.tsx` 設定 `item/form` 為 `presentation: 'modal'`），`dismiss()` 會直接關掉 modal 回到底下原本開著的單品詳細頁；該頁（`app/closet/item/[id].tsx`）已經是用 `useFocusEffect`（ios-008 修過）載入資料，回到畫面時會自動重新查詢，能看到剛存檔的新資料
  - 新增單品（非編輯模式）的儲存後導頁行為維持不變，仍然 `router.replace('/closet')` 回衣櫃首頁——使用者這次的需求明確只針對「編輯」情境，新增單品時還沒有一個可以回去的「該單品詳細頁」
  - 這是純導頁邏輯調整，沒有新增依賴、沒有動任何資料層程式碼，不需要新增單元測試（`form.tsx` 本身也沒有既有的元件測試涵蓋這塊）
  - 本機建置 Android release APK（sparkwear-v2.0.0-20260810-1739.apk）並上傳 Google Drive 供使用者實機測試
- 執行過的驗證：`pnpm test`（24 suites、344 tests 全過，無新增/新壞測試）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過型別檢查與建置成功，**尚未經過使用者實機互動驗證**——需要使用者實際點進某單品、按編輯、改點東西存檔，確認畫面留在該單品詳細頁而不是跳回衣櫃首頁
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260810-1739.apk）實機測試「編輯單品儲存後畫面停留」，以及仍待回報的「使用次數排行同步」（工作階段 026）與 `ranking-001`（分類篩選）的實機測試結果

### 工作階段 026

- 日期：2026-08-10
- 本輪目標：使用者回報「我手動更改了使用次數，但是排行中的使用次數卻還是用舊的數據」，用 systematic-debugging 排查根因並修好
- 已完成：
  - 追根因：這個 App 一直有兩條平行的使用次數資料——(1) `items.usage_count` 欄位（單品表單直接讀寫），(2) `item_usage_logs` 表的逐筆使用記錄。`src/hooks/useRanking.ts` 的 usage/cp 兩個排行指標（不論『全部』還是『本月/本季/本年/近一年』區間）完全依 `getAllUsageCounts()`/`getUsageCountsByPeriod()`（皆對 `item_usage_logs` 做 `COUNT(*)`）計算，從未讀過 `items.usage_count`；`app/closet/item/form.tsx` 手動編輯使用次數時只呼叫 `updateItem()` 寫 (1)，完全不會在 (2) 補上對應紀錄，兩邊因此不同步，排行頁看到的是舊資料
  - 這個雙軌設計本身是刻意的（`item_usage_logs` 帶日期才能支援排行頁的區間篩選），`src/db/index.ts` 的 v3→v4 migration 也證實同樣的思路：那次是一次性把 `items.usage_count` 超過 `item_usage_logs` 筆數的落差，用 `source='migration'` 補插回 `item_usage_logs`；但這個補洞邏輯只在該次 migration 執行過一次，之後任何新的手動編輯都不會再觸發，所以這次的修法是把同一套「補落差」邏輯做成一個常駐函式，往後每次手動編輯都會自動同步
  - `src/services/usageLogService.ts` 新增 `reconcileUsageLogs(db, itemId, targetCount, referenceDate)`：查出該單品目前 `item_usage_logs` 筆數，比目標值少就用 `source='manual'` 補插（日期用該單品購買日期，沒有則用今天），比目標值多就優先刪除 `manual`／`migration` 來源的 log（留下跟真實穿搭紀錄對應的 `outfit` 來源 log，不破壞既有刪除穿搭時的計數機制）
  - `src/services/itemService.ts` 的 `saveItem()`（新增單品時若初始 usageCount > 0）與 `updateItem()`（usageCount 有變動時）都呼叫 `reconcileUsageLogs()`，讓表單編輯路徑也會同步 `item_usage_logs`，不再只更新 (1) 不動 (2)
  - 範圍只涵蓋「表單手動編輯 usage_count」這一條路徑；意外發現 `backupService.ts` 的匯出/匯入 manifest 完全沒有涵蓋 `item_usage_logs` 表（還原備份後 usage_count 會對但排行頁期間統計會是空的），屬於另一個更大範圍、使用者尚未回報過的既有缺口，本輪沒有動它，只記錄在「目前已驗證狀態」避免遺失
  - 新增測試：`src/__tests__/services/usageLogService.test.ts`（`reconcileUsageLogs` 5 項：數量吻合不動作／補插差額／從 0 開始補插／刪除優先順序／查無 log 視為 0）、`itemService.test.ts` 補 4 項（`saveItem`/`updateItem` 在 usageCount 有無變動、增加、減少時是否正確呼叫 `reconcileUsageLogs`）
  - 本機建置 Android release APK（sparkwear-v2.0.0-20260810-1728.apk）並上傳 Google Drive 供使用者實機測試
  - 這是 items-001（單品表單手動編輯使用次數功能）已通過驗證後才浮現的後續問題，屬於同一功能的關聯修復，記在 items-001 的 `notes` 裡（不改變它的 `passing` 狀態，因為表單欄位本身運作正常，壞的是另一個子系統／排行頁的資料同步），沒有另開新的 feature_list 項目，也沒有動 `ranking-001`（分類篩選功能）目前 `in_progress` 的狀態，避免違反「同時只允許一個 in_progress」
- 執行過的驗證：`pnpm test`（24 suites、344 tests 全過，含新增 9 項）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease` 建置成功
- 已知風險或未解決問題：本次改動只做過自動化檢查（單元測試＋型別檢查）與建置成功，**尚未經過使用者實機互動驗證**——需要使用者用新 APK 手動改一件單品的使用次數，回到排行頁確認數字有跟著變才算完整驗證；backupService.ts 未涵蓋 item_usage_logs 的既有缺口也還沒處理
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260810-1728.apk）實機測試「編輯單品使用次數 → 排行頁確認數字更新」後回報；仍要等使用者回報 ranking-001（分類篩選）的實機測試結果，才能把它改成 passing

### 工作階段 025

- 日期：2026-08-10
- 本輪目標：使用者要求在「排行」頁最上排新增分類篩選項目（多選/單選），項目為上衣/裙裝/褲裝/洋裝/外套/套裝/日常/鞋類/包包/猶豫/留校/冷凍，且要能自行新增/刪除
- 已完成：
  - 逐字比對後發現使用者列的篩選項目就是 `src/constants/defaults.ts` 的 `DEFAULT_CATEGORIES`——App 既有的可編輯分類系統（見「分類」分頁 `app/closet/(tabs)/category.tsx`），因此直接重用既有 `categories` 表與 `categoryService`，不另建新的標籤系統
  - `src/hooks/useRanking.ts` 新增匯出的純函式 `filterByCategory(items, categoryIds)`（`categoryIds` 為空陣列時不篩選）與 `categoryIds` 參數；篩選發生在抓到 `items` 之後、進入任何指標分支之前，所以 usage/cp/price（逐品項）與 brand_count/color_count（聚合）指標都能正確反映篩選結果
  - 把「分類」分頁原本內嵌在 `category.tsx` 裡的編輯 Modal（新增/上下排序/刪除，含確認刪除對話框）抽成共用元件 `src/components/shared/CategoryEditModal.tsx`；連同「新增分類時依序使用的預設顏色」PALETTE 一起移到 `src/constants/defaults.ts`（`CATEGORY_PALETTE`）；`category.tsx` 改用這個共用元件，行為完全不變
  - `app/closet/(tabs)/ranking.tsx` 在頭部下方、指標選單之上新增一排分類篩選 chip：`selectedCategoryIds`（`Set<string>`）以 toggle 方式支援多選/單選，選中的分類用主題色反白；chip 列最右側加一個「編輯」按鈕，開啟同一份 `CategoryEditModal` 做新增/刪除/排序；刪除某分類時同步把它從 `selectedCategoryIds` 移除，避免殘留無效篩選條件
  - 新增 `src/__tests__/hooks/useRanking.test.ts` 的 `filterByCategory` 測試（空陣列不篩選、單一分類、多分類 OR 邏輯、未分類單品在有篩選時被排除，共 4 項）
  - 本機建置 Android release APK（sparkwear-v2.0.0-20260810-1408.apk）並上傳 Google Drive 供使用者實機測試
  - 使用者看過設計後立刻回報修正需求：分類 chip 應該「預設全部都按」（畫面上一開始就全部反白），不然使用者會誤以為「沒按=不會顯示」；且使用者自行縮小到某幾個分類後，這個篩選結果要維持住，不能又自動跳回全選，要等使用者下次自己改選才變
  - 修法：`app/closet/(tabs)/ranking.tsx` 新增 `categoryFilterTouched` 旗標；分類清單載入後，只要這個旗標還是 `false`（使用者從沒手動點過 chip），就用 `useEffect` 把 `selectedCategoryIds` 同步成全部分類 id（畫面全反白）；`toggleCategory` 一被呼叫就把旗標設成 `true`，之後這個自動同步永久停止，選取結果完全交給使用者手動控制，不會因為 `useFocusEffect` 重新載入分類清單就被重置
  - 實際傳給 `useRanking` 的 `categoryIdsArray` 在「全選」與「使用者取消到一個都沒選」這兩種情況都視為不篩選（回傳空陣列，含未分類單品都顯示），避免清單意外變成完全空白；使用者手動縮小到具體幾個分類時，未分類單品會被排除，是預期行為
  - 修好後重新本機建置 Android release APK（sparkwear-v2.0.0-20260810-1417.apk）並上傳 Google Drive
  - 使用者實機測試後回報「點進排行頁畫面一直閃」；用 systematic-debugging 排查，追蹤 `node_modules/@react-navigation/core/lib/module/useFocusEffect.js` 原始碼確認根因：它的 `React.useEffect` 依賴 `[effect, navigation]`，且只要畫面仍在聚焦、傳入的 `effect` 函式參照一改變就會立刻重新執行一次 callback（不是只在真正的 focus 事件才觸發）；第二輪加的「自動全選」`useEffect` 直接依賴 `categories` 這個陣列物件本身，但 `categoryService.getCategories()` 每次 SQL 查詢都回傳全新的陣列參照（即使資料內容完全沒變），於是形成無限迴圈：`reloadCategories()` 回傳新陣列 → 自動全選 effect 誤判內容變了又重跑 → `selectedCategoryIds` 變新物件 → `categoryIdsArray`／`useRanking` 的 `reload` 跟著變新參照 → `useFocusEffect` 判定 callback 參照改變、在畫面仍聚焦時立刻重跑 → 又呼叫一次 `reload()`/`reloadCategories()` → 迴圈繼續，畫面因此不停重新渲染而一直閃
  - 修法：把自動全選 effect 的依賴從 `categories` 陣列本身改成用分類 id 組出來的字串 `categoryIdsKey`（`categories.map(c => c.id).join(',')`），同一批分類重複 reload 只要 id 內容沒變，字串值就相同，effect 不會被誤判成要重跑，從根本打斷這條無限迴圈；只動依賴陣列，不影響任何篩選邏輯本身
  - Expo web（`pnpm web`）因為 `react-native-google-mobile-ads` 用了 web 不支援的原生模組（`codegenNativeComponent`）而 bundling 失敗，這個專案目前無法在瀏覽器裡快速驗證畫面互動，只能靠自動化檢查＋實機測試
  - 修好無限迴圈後重新本機建置 Android release APK（sparkwear-v2.0.0-20260810-1426.apk）並上傳 Google Drive
- 執行過的驗證：`pnpm test`（23 suites、334 tests 全過，含新增 4 項，三輪皆重跑過一次）；`npx tsc --noEmit -p .`（無新增型別錯誤，既有 outfits/form.tsx 錯誤與本次改動無關）；`./gradlew assembleRelease`（三輪皆建置成功）
- 已知風險或未解決問題：本次改動只做過靜態檢查（型別＋單元測試）與建置成功，**完全沒有做過模擬器或實機互動驗證**（Expo web 因原生模組限制無法用來驗證）——分類 chip 預設全反白、畫面不再閃爍、多選/取消、排行清單是否正確依篩選結果更新且不會自動跳回全選、「編輯」Modal 的新增/刪除是否跟「分類」分頁行為一致，都還沒有實際點過確認
- 下一步最佳動作：等使用者用新 APK（sparkwear-v2.0.0-20260810-1426.apk）實機測試分類篩選功能（特別是確認畫面不再閃爍）後回報，確認正常再把 `ranking-001` 補齊 evidence 並改成 `passing`

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
