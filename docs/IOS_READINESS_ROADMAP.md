# 五個 SPARK App — iOS 上架準備度總覽與行動計畫

> 調查對象：SPARKWEAR / SPARKSHAPE / SPARKFIT / SPARKPLATE / SPARKNOTE
> 調查日期：2026-07-17
> 目標：以「上架 App Store」為終點，盤點目前差距並規劃行動步驟

---

## 結論先講

**目前這 5 個 App 都還「不能」在 iOS 上使用 — 但不是因為程式碼寫壞了，而是因為 iOS 建置環境跟平台設定完全還沒開始。**

好消息：
- 5 個 App 都是用 **Expo Managed Workflow**，且用的套件（`expo-camera`、`expo-image-picker`、`expo-sqlite`、`expo-location`、`expo-notifications`、`expo-media-library` 等）全部是 Expo 官方套件，原生就支援 iOS，程式碼裡沒有發現任何 Android-only 或會讓 iOS 編譯失敗的東西。
- 5 個 App 的 `app.json` 都已經寫好 `ios.bundleIdentifier` 跟必要的權限說明文字（`NSCameraUsageDescription` 等），這代表底子都已經打好了。

壞消息（也就是目前完全擋住 iOS 的關鍵原因）：
- 這台 iMac **沒有裝完整版 Xcode**，只有 Command Line Tools，也**沒裝 CocoaPods** → 現在連「編出一個能跑的 iOS App」都做不到，5 個 App 沒有一個曾經 build 過 iOS 版本（沒有任何一個專案有 `ios/` 原生資料夾）。
- **沒有 Apple Developer Program 帳號**（$99/年）→ 不能用實體 iPhone 測試、不能上 TestFlight、更不能上架 App Store。
- **EAS（Expo Application Services）帳號沒登入**、且 5 個 App 都沒有 `extra.eas.projectId` → 代表沒有任何一個專案跟 EAS 雲端建置服務綁定過。
- 只有 SPARKWEAR 有比較完整的 `eas.json`（含 iOS build profile），其餘 4 個 App 的 `eas.json` 要嘛不存在、要嘛只設定了 Android。

換句話說：**這是一個「從零開始建置 iOS 流程」的專案，不是「修 bug」的專案。** 因為 5 個 App 架構高度相似（都是 Expo + expo-router + expo-sqlite），只要把第一個 App（建議 SPARKWEAR，因為文件最完整）走通整套流程，其餘 4 個可以用同一套 SOP 快速複製。

---

## 各 App 現況總表

| 項目 | SPARKWEAR | SPARKSHAPE | SPARKFIT | SPARKPLATE | SPARKNOTE |
|---|---|---|---|---|---|
| Expo SDK | 54 | 54 | 54 | 54 | **56**（跟其他 4 個不同版本） |
| `ios.bundleIdentifier` | ✅ com.sparkwear.app | ✅ com.sparkshape.app | ✅ com.sparkfit.app | ✅ com.sparkplate.app | ✅ com.sparknotes.app |
| `ios/` 原生資料夾（曾 build 過） | ❌ | ❌ | ❌ | ❌ | ❌ |
| `eas.json` | ✅ 有 iOS profile | ❌ 不存在 | ⚠️ 只有 Android | ❌ 不存在 | ❌ 不存在 |
| `extra.eas.projectId`（EAS 專案綁定） | ❌ | ❌ | ❌ | ❌ | ❌ |
| App icon 1024×1024、無透明背景 | ⚠️ 尺寸OK但**有 alpha 透明通道** | ✅ OK | ⚠️ **只有 747×747**，偏小 | ⚠️ 尺寸OK但**有 alpha 透明通道** | ⚠️ 1254×1254（非標準尺寸，Expo 會自動縮，建議改成 1024） |
| 特殊 iOS 風險點 | 無 | 無（有跨 App 的 `LSApplicationQueriesSchemes`，需三個 App 一起測） | 無 | 無 | 背景定位權限已宣告但**功能還沒實作**；`expo-notifications` 在 iOS 需另外設定 APNs |

---

## 為什麼「程式碼」基本上沒問題

檢查了 5 個 App 的 `package.json`，用到的原生模組全部是跨平台套件：

- 相機/相簿：`expo-camera`、`expo-image-picker`、`expo-media-library`、`expo-image-manipulator`
- 資料庫：`expo-sqlite`
- 手勢/動畫：`react-native-gesture-handler`、`react-native-reanimated`、`react-native-worklets`
- 其他：`expo-document-picker`、`expo-sharing`、`expo-file-system`、`react-native-view-shot`（SPARKWEAR/SPARKPLATE）、`react-native-chart-kit`+`react-native-svg`+`react-native-calendars`（SPARKFIT）、`react-native-volume-manager`（SPARKPLATE）、`expo-location`+`expo-notifications`+`expo-task-manager`（SPARKNOTE）

這些套件全部原生支援 iOS，沒有發現任何一個是「Android-only」。SPARKWEAR 的 `docs/REQUIREMENTS.md` 裡也明確把「Phase 6：iOS 驗證」跟「Phase 7：打包發布（EAS Build）」列為已規劃項目，只是實際上還沒有執行環境可以動手做。

唯一需要留意程式邏輯的地方：**SPARKNOTE 的「雷店接近提醒」**。目前 `app.json` 已經宣告了背景定位權限（`ACCESS_BACKGROUND_LOCATION`、`NSLocationAlwaysAndWhenInUseUsageDescription`），也裝了 `expo-task-manager`，但翻過原始碼（`app/store/add.tsx`、`app/settings.tsx`）發現目前只用到**前景定位**（`requestForegroundPermissionsAsync` 記錄店家座標）跟本機通知排程，並沒有真的呼叫背景定位或地理圍籬（geofencing）API。也就是說「接近提醒」這個背景功能目前是**尚未實作**的預留設定，不影響現有功能上 iOS，但未來要做時要注意：iOS 對背景定位審查比 Android 嚴格很多（App Store 審核會要求說明用途，且要在 `Info.plist` 加 `UIBackgroundModes: ["location"]`，目前沒有設定）。

---

## 行動計畫（建議順序）

### Phase A — 打通本機 iOS 開發環境（一次性，全部 5 個 App 共用）

1. 到 App Store 安裝完整版 **Xcode**（免費，約 10–40GB；目前硬碟剩餘 70GB，空間足夠）
2. 開啟一次 Xcode，同意授權並讓它安裝額外元件
3. 安裝 **CocoaPods**：`brew install cocoapods`
4. 確認：`xcodebuild -version`、`pod --version`、`xcrun simctl list devices` 都能正常輸出

> 這一步 SPARKWEAR 專案裡已經有現成指南：`docs/ios-testing/README.md`，內容是通用的，5 個 App 都適用。

### Phase B — 模擬器驗證（免費，不需要 Apple Developer 帳號）

對每個 App 依序執行：

```bash
cd /Users/mimi/Documents/<APP資料夾>
npx expo run:ios
```

- 第一次執行會自動 `expo prebuild` 產生 `ios/` 原生資料夾，並在模擬器安裝執行
- 逐一確認核心功能：資料庫（`expo-sqlite`）讀寫、相機/相簿權限彈窗與拍照/選圖、資料匯出入（SPARKWEAR/SPARKSHAPE/SPARKPLATE 的 ZIP 匯出）、SPARKNOTE 的定位權限彈窗
- 建議順序：**SPARKWEAR → SPARKSHAPE → SPARKFIT → SPARKPLATE → SPARKNOTE**（SPARKNOTE 放最後，因為它 Expo SDK 版本不同、且有定位/通知這類 iOS 上比較容易出狀況的功能）
- 修正各 App icon 問題（見上表）：
  - SPARKWEAR、SPARKPLATE 的 icon.png **要先移除 alpha 透明通道**再重新指定（可用 `sips` 或 Photoshop/Figma 匯出時關閉透明背景），否則之後 EAS build 或上傳 App Store Connect 會直接被拒
  - SPARKFIT icon 建議重新輸出成 1024×1024（目前 747×747 偏小，正式上架前務必補齊）

### Phase C — 申請 Apple Developer Program（$99/年）

- 前往 https://developer.apple.com/programs/enroll/ 用 `kyoangel.tw@gmail.com`（已出現在 SPARKWEAR 的 `eas.json` submit 設定中）申請
- 審核通常 1–2 天（若用個人身分申請，需準備身分證件；若用公司名義會更久，需要 D-U-N-S Number）
- 這一步是接下來所有「實機測試」「上架」動作的前提，**建議在 Phase B 進行的同時就先送出申請**，因為審核需要等待時間

### Phase D — EAS 帳號設定與雲端建置（5 個 App 各自要做一次）

1. `npx eas login`（目前 `eas whoami` 顯示 Not logged in，需要先登入或註冊 Expo 帳號）
2. 對每個 App 執行 `eas build:configure`，會自動在 `app.json` 補上 `extra.eas.projectId`
3. 依序補齊各 App 的 `eas.json`（SPARKSHAPE / SPARKPLATE / SPARKNOTE 目前完全沒有；SPARKFIT 要補上 iOS profile），可以直接參考 SPARKWEAR 現有的 `eas.json` 當範本
4. Apple Developer 帳號核准後，在 EAS 裡連結該帳號（`eas credentials`），讓 EAS 自動處理憑證（Provisioning Profile、Distribution Certificate）
5. 依序執行：
   ```bash
   eas build --platform ios --profile development   # 實機測試用（development client）
   eas build --platform ios --profile preview        # 給人用 ad-hoc 安裝測試
   ```
6. SPARKNOTE 若要用 `expo-notifications` 推播，需要額外在 Apple Developer 後台建立 **APNs Key**，並在 EAS 憑證設定中上傳

### Phase E — TestFlight 內部測試 → 正式上架 App Store

1. `eas submit --platform ios` 把 build 直接送到 App Store Connect
2. 在 App Store Connect 建立 App 記錄（5 個各自要建立，含名稱、分類、隱私權說明、螢幕截圖等素材）
3. 先開 **TestFlight** 給自己或少數人測試裝置版本的實際表現
4. 確認無誤後提交 App Store 審核（正式上架）
   - SPARKNOTE 因為用了定位權限，審核時要準備好清楚的用途說明文字（App Review 對定位權限特別會要求說明，尤其是 "Always" 等級的權限）

---

## 每個 App 的差異注意事項

| App | 額外要注意的點 |
|---|---|
| **SPARKWEAR** | 文件最完整（已有 `docs/ios-testing/README.md`、完整 `eas.json`），建議當作第一個打通流程的「示範專案」；icon 需移除 alpha 透明通道 |
| **SPARKSHAPE** | `app.json` 裡有 `LSApplicationQueriesSchemes: ["sparkplate", "sparkfit"]`，代表它會用 URL Scheme 跳轉到另外兩個 App，這三個 App 的 iOS 版本要一起測試「跳轉互通」是否正常 |
| **SPARKFIT** | icon 尺寸太小（747×747），需要先補一張 1024×1024 高解析度版本；`eas.json` 目前只有 Android 設定，需要新增 iOS profile |
| **SPARKPLATE** | icon 需移除 alpha 透明通道；完全沒有 `eas.json`，需要從頭建立 |
| **SPARKNOTE** | Expo SDK 56（跟其他 4 個的 SDK 54 不同版本，混合開發時要注意）；背景定位/接近提醒功能尚未實作完成，若要做，iOS 端需另外加 `UIBackgroundModes` 設定並準備審核用途說明；推播通知需要額外申請 APNs Key；完全沒有 `eas.json`，需要從頭建立 |

---

## Checklist（可直接勾選執行）

**環境（一次性）**
- [ ] 安裝完整版 Xcode
- [ ] 安裝 CocoaPods（`brew install cocoapods`）
- [ ] 申請 Apple Developer Program（$99/年）
- [ ] `npx eas login` 登入 Expo/EAS 帳號

**每個 App 都要做一次（SPARKWEAR / SPARKSHAPE / SPARKFIT / SPARKPLATE / SPARKNOTE）**
- [ ] `npx expo run:ios` 本機模擬器跑通，核心功能手動驗證一輪
- [ ] 修正 icon（尺寸 1024×1024、不能有透明通道）
- [ ] 補齊 `eas.json`（development / preview / production 三個 profile 都要有 iOS 設定）
- [ ] `eas build:configure` 綁定 EAS 專案
- [ ] `eas credentials` 設定 Apple 簽署憑證
- [ ] `eas build --platform ios --profile preview` 建置測試版
- [ ] TestFlight 內部測試
- [ ] App Store Connect 建立上架資料（名稱/分類/截圖/隱私權說明）
- [ ] 提交 App Store 審核

**SPARKNOTE 專屬**
- [ ] 決定是否要在此階段完成「背景接近提醒」功能，若要則補 `UIBackgroundModes` 設定
- [ ] 申請 APNs Key 供 `expo-notifications` 使用

---

## 參考資料

- 已有的本機環境檢測與操作指南：`SPARKWEAR/docs/ios-testing/README.md`
- Expo 官方 iOS 建置文件：https://docs.expo.dev/build/setup/
- Apple Developer Program 申請：https://developer.apple.com/programs/enroll/
- EAS Submit（App Store 上傳）文件：https://docs.expo.dev/submit/ios/
