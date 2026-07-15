# iOS 測試指南（iMac，無實體 Apple 手機）

> 建立日期：2026-07-15
> 目的：說明如何在沒有 iPhone 的情況下，用 iMac 測試 SPARKWEAR 的 iOS 版本。

## 結論先講

**可以**，用 macOS 內建的 **iOS 模擬器（Simulator）** 就能測試，不需要買 iPhone，也**不需要**付費的 Apple Developer 帳號（$99/年）— 那個只有在要上架 App Store 或裝到「實體」iPhone 上測試（TestFlight）時才需要。

但目前這台 iMac **還沒有裝完整版 Xcode**，只有裝了 Command Line Tools，所以模擬器還無法直接使用，需要先安裝。

---

## 目前環境檢測結果（2026-07-15）

| 項目 | 狀態 |
|---|---|
| macOS 版本 | 15.7.3（Sequoia） |
| 晶片 | Apple Silicon（arm64）→ 對跑模擬器很有利，效能好 |
| Xcode（完整版） | ❌ 未安裝，只有 Command Line Tools |
| CocoaPods | ❌ 未安裝 |
| 可用模擬器 | 無（因為沒裝完整 Xcode） |
| 專案 `app.json` iOS 設定 | ✅ 已有（bundleIdentifier: `com.sparkwear.app`、相機/相簿權限說明） |
| 專案 `eas.json` iOS build 設定 | ✅ 已有（development / preview profile） |
| 本機 `ios/` 原生資料夾 | ❌ 不存在（目前是 Expo managed workflow，還沒 prebuild） |

---

## 需要準備的東西

1. **從 App Store 安裝完整版 Xcode**（免費，但檔案很大，約 10–40GB 視版本而定，抓幾十分鐘到幾小時視網速）
   - 安裝完成後第一次開啟要同意授權、並讓它安裝額外元件
   - 之後用 `xcodebuild -version` 應該能看到版本號
2. **安裝 CocoaPods**（iOS 原生依賴管理工具）
   ```bash
   sudo gem install cocoapods
   # 或用 Homebrew
   brew install cocoapods
   ```
3. **確認模擬器機型已下載**（裝好 Xcode 後，Xcode → Settings → Platforms 可以下載不同 iOS 版本的模擬器）

> 磁碟空間建議：Xcode + 模擬器 runtime 加起來可能吃到 20–50GB，建議先確認 iMac 剩餘空間足夠。

---

## 兩種測試方式

不管哪一種，「執行模擬器」這件事都需要本機裝好完整 Xcode（因為 Simulator.app 是 Xcode 的一部分）。差別在「編譯 App」這個動作在哪裡做。

### 方式 A：本機直接建置（推薦，適合開發階段反覆測試）

```bash
npx expo run:ios
```

- 第一次執行會自動做 `expo prebuild`，產生 `ios/` 原生專案資料夾
- 會自動抓取一個已安裝的模擬器機型（例如 iPhone 15）並啟動、安裝、執行
- 優點：免費、快、改完程式碼可以直接重跑，開發迭代速度快
- 缺點：本機要裝好 Xcode + CocoaPods，第一次設定較久

### 方式 B：用 EAS Cloud Build 建置模擬器版本

不想在本機編譯 iOS 原生程式碼時可以用這個，Expo 官方雲端幫你建置：

1. 修改 `eas.json`，把要用來測試的 profile 的 `ios.simulator` 設成 `true`（目前 `preview` profile 是 `false`，是給「實體裝置」用的；要給模擬器用要改成 `true`）
2. 執行：
   ```bash
   eas build --platform ios --profile preview
   ```
3. 建置完成後下載下來的是給模擬器用的 `.app`／`.tar.gz`，直接把它拖進已開啟的 iOS 模擬器視窗裡就會安裝執行
- 優點：本機不需要裝 CocoaPods、不需要處理原生建置環境（但還是要裝 Xcode 才能「執行」模擬器本身）
- 缺點：要排隊等雲端建置（免費額度有限），每次改 native 部分都要重新上傳建置，比本機慢

---

## 建議執行順序（Checklist）

- [ ] 確認 iMac 剩餘硬碟空間足夠（建議 50GB 以上寬裕空間）
- [ ] App Store 安裝 Xcode
- [ ] 打開 Xcode 一次，完成授權同意 + 額外元件安裝
- [ ] 安裝 CocoaPods（`brew install cocoapods`）
- [ ] 在專案根目錄執行 `npx expo run:ios` 試跑
- [ ] 確認模擬器裡 App 能正常啟動、資料庫（expo-sqlite）、照片存取等功能正常
- [ ] 之後想產生正式測試版本（TestFlight 給別人測）時，才需要考慮 Apple Developer 帳號（$99/年）

---

## 之後如果要給別人（用實體 iPhone）測試

那才會需要：
- Apple Developer Program 付費帳號（$99/年）
- 用 `eas build --platform ios --profile development`（實體裝置版）+ TestFlight 或 ad-hoc 安裝

這部分屬於 Phase 7（打包發布）的範圍，目前先專注在模擬器測試（Phase 6）即可。
