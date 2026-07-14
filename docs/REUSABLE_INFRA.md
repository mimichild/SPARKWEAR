# 可複用基礎設施參考（給新專案用）

> 本文件整理 SPARKWEAR 中「跟 App 內容無關、可直接複用」的技術基礎設施、建置方法與驗證方式。
> 新專案啟動時可直接參考或複製以下內容，省去重新設計建置/測試/部署流程的心力。
> 衣櫃 App 業務內容（DB schema、services、components 等）**不在此範圍**，新專案不需要參考。

---

## 1. 技術選型骨架

```
React Native 0.81.x + Expo SDK 54
Expo Router v6（file-based routing）
TypeScript（strict）
Zustand v5（全域狀態管理，如有需要）
Jest + jest-expo + @testing-library/react-native（測試）
EAS Build（打包部署）
```

依新專案需求增減：`expo-sqlite`、`expo-image-picker` 等模組僅在需要本機 DB / 相機相簿功能時才加。

---

## 2. TypeScript 設定（`tsconfig.json`）

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "src/__mocks__",
    "src/__tests__"
  ]
}
```

---

## 3. Jest 設定（寫在 `package.json` 的 `"jest"` 區塊）

```json
{
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|zustand)"
    ],
    "moduleNameMapper": {
      "^expo-sqlite$": "<rootDir>/src/__mocks__/expo-sqlite.ts",
      "^expo-file-system$": "<rootDir>/src/__mocks__/expo-file-system.ts",
      "^expo-image-picker$": "<rootDir>/src/__mocks__/expo-image-picker.ts",
      "^@react-native-async-storage/async-storage$": "<rootDir>/src/__mocks__/async-storage.ts"
    },
    "testMatch": [
      "<rootDir>/src/__tests__/**/*.test.(ts|tsx)"
    ],
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/__mocks__/**",
      "!src/__tests__/**"
    ]
  }
}
```

`moduleNameMapper` 只需保留新專案實際用到的 native 模組對應；沒用到的模組（如沒有 DB 就拿掉 `expo-sqlite`）不需要保留。

---

## 4. Native 模組 Mock 模板（`src/__mocks__/`）

放在 Jest 測試環境下，native-only 模組要 mock 才能跑單元測試。模板（依新專案實際用到的模組調整）：

**`async-storage.ts`**（記憶體版 key-value store）
```ts
const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
  clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve(); }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, store[k] ?? null]))),
  multiSet: jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); return Promise.resolve(); }),
  __store: store,
};

export default AsyncStorage;
```

**`expo-file-system.ts`**（純 stub，無實際讀寫）
```ts
export const documentDirectory = '/mock/documents/';
export const cacheDirectory = '/mock/cache/';

export const getInfoAsync = jest.fn().mockResolvedValue({ exists: false, isDirectory: false });
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
export const copyAsync = jest.fn().mockResolvedValue(undefined);
export const deleteAsync = jest.fn().mockResolvedValue(undefined);
export const readAsStringAsync = jest.fn().mockResolvedValue('');
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);
export const readDirectoryAsync = jest.fn().mockResolvedValue([]);
export const moveAsync = jest.fn().mockResolvedValue(undefined);

export const EncodingType = { Base64: 'base64', UTF8: 'utf8' };
```

**`expo-sqlite.ts`**（只有用到 SQLite 才需要）
```ts
const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
  closeAsync: jest.fn().mockResolvedValue(undefined),
};

export const SQLiteProvider = ({ children }: { children: React.ReactNode }) => children;
export const useSQLiteContext = () => mockDb;
export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);

export { mockDb as __mockDb };
```

模板原則：每個 mock 都是同步回傳 resolved Promise 的 `jest.fn()`，不做真正的 I/O。

---

## 5. Web / Native 雙實作分流模式

Metro 會自動依平台選擇 `.web.ts` 或預設檔，這是「native-only 功能在 Web 預覽時降級」的標準寫法：

**`xxx.ts`**（native，直接轉導出真實模組）
```ts
export { useSQLiteContext } from 'expo-sqlite';
```

**`xxx.web.ts`**（web stub，no-op 或記憶體版替代）
```ts
import type { ReactNode } from 'react';

export function SQLiteProvider({ children }: { children: ReactNode }) {
  const React = require('react');
  return React.createElement(React.Fragment, null, children);
}

export const DB_NAME = '';
export async function initDatabase() {}
```

適用場景：任何 native-only API（檔案系統、相機、本機 DB）想讓 Web 版本可以跑起來做 UI 預覽時，都用這個模式包一層。

---

## 6. 回歸測試腳本骨架（`scripts/regression.sh`）

```bash
#!/bin/bash
# 完整回歸測試
# 用法: bash scripts/regression.sh [--skip-visual]

set -e

SKIP_VISUAL=false
for arg in "$@"; do
  [ "$arg" = "--skip-visual" ] && SKIP_VISUAL=true
done

PASS_COUNT=0
FAIL_COUNT=0
FAILED_STEPS=()

step_pass() { echo "  ✅ $1"; PASS_COUNT=$((PASS_COUNT+1)); }
step_fail() { echo "  ❌ $1"; FAIL_COUNT=$((FAIL_COUNT+1)); FAILED_STEPS+=("$1"); }

echo "【1/3】TypeScript 型別檢查"
if npx tsc --noEmit 2>&1; then
  step_pass "TypeScript 型別檢查通過"
else
  step_fail "TypeScript 型別錯誤"
fi

echo "【2/3】Jest 單元測試"
if npx jest --passWithNoTests --forceExit 2>&1; then
  step_pass "Jest 單元測試全部通過"
else
  step_fail "Jest 單元測試失敗"
fi

if [ "$SKIP_VISUAL" = false ]; then
  echo "【3/3】視覺回歸測試（Web + agent-browser）"
  if bash e2e/visual.sh 2>&1; then
    step_pass "視覺回歸測試通過"
  else
    step_fail "視覺回歸測試失敗"
  fi
else
  echo "【3/3】視覺回歸測試 ⏭  (--skip-visual)"
fi

printf "✅ 通過: %-3s  ❌ 失敗: %-3s\n" "$PASS_COUNT" "$FAIL_COUNT"

if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
  echo "失敗項目："
  for step in "${FAILED_STEPS[@]}"; do
    echo "  • $step"
  done
  exit 1
fi
```

---

## 7. 視覺回歸測試骨架（`e2e/visual.sh`，需 agent-browser）

流程：`expo export --platform web` 產生靜態檔 → `serve` 啟一個本機伺服器 → `agent-browser` 開瀏覽器斷言畫面內容/截圖。

```bash
#!/bin/bash
set -e

PORT=8092
BASE_URL="http://localhost:$PORT"
PASS=0
FAIL=0
ERRORS=()

log_pass() { echo "  ✅ $1"; PASS=$((PASS+1)); }
log_fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); ERRORS+=("$1"); }

echo "🔨 Building web export..."
if ! npx expo export --platform web > /tmp/expo-export.log 2>&1; then
  echo "❌ Web export failed:"; tail -20 /tmp/expo-export.log; exit 1
fi

echo "🌐 Starting static server on port $PORT..."
npx serve dist --listen $PORT --single > /tmp/serve.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill $SERVER_PID 2>/dev/null || true
  npx agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 15); do
  if curl -s "$BASE_URL" > /dev/null 2>&1; then break; fi
  sleep 1
done

# ── 依新專案實際畫面替換以下斷言 ──
npx agent-browser open "$BASE_URL" 2>/dev/null
npx agent-browser wait --load networkidle 2>/dev/null
npx agent-browser wait 3000 2>/dev/null

TITLE=$(npx agent-browser get title 2>/dev/null)
if echo "$TITLE" | grep -qi "替換為新專案名稱"; then
  log_pass "Page title 正確"
else
  log_fail "Page title 不符（got: $TITLE）"
fi

npx agent-browser screenshot /tmp/e2e-home.png 2>/dev/null

echo "✅ 通過: $PASS  ❌ 失敗: $FAIL"
[ $FAIL -eq 0 ]
```

斷言內容（標題文字、按鈕文字、tab 名稱）需依新專案畫面替換，骨架（build → serve → 開瀏覽器 → 斷言 → 截圖 → cleanup）直接複用。

---

## 8. EAS Build 設定（`eas.json`）

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "改成新專案對應的 Apple ID" }
    }
  }
}
```

---

## 9. `app.json` 設定樣板（節錄通用部分）

```json
{
  "expo": {
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "android": {
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

`name`、`slug`、`scheme`、`bundleIdentifier`、`package`、icon/splash、權限文案、plugins 清單（如 `expo-sqlite`、`expo-image-picker`）需依新專案實際內容與用到的模組調整。

---

## 10. `.gitignore`（Expo/RN 標準規則）

```
node_modules/

.expo/
dist/
web-build/
expo-env.d.ts

.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

.metro-health-check*

npm-debug.*
yarn-debug.*
yarn-error.*

.DS_Store
*.pem

.env*.local

*.tsbuildinfo

/ios
/android

/coverage
/tmp/e2e-*.png

*.apk
*.aab
*.ipa

*.log
/tmp/expo-*.log
```

---

## 11. Android 環境設定（機器層級知識，非專案設定）

打包 Android release APK 時必踩的環境問題（與 App 內容無關，純粹是這台 Mac 上的工具鏈設定）：

```bash
# JAVA_HOME 必須手動指定為 Homebrew 安裝的 JDK 21，不可使用編輯器內建的 JRE
# （VS Code / Antigravity 內建 JRE 只有 JRE 沒有 JDK，會導致 "jlink does not exist" 錯誤）
export JAVA_HOME="/opt/homebrew/Cellar/openjdk@21/<版本號>/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

# ADB 在 Android SDK 的 platform-tools，需加入 PATH
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
```

常用建置/安裝指令：
```bash
npx expo run:android --variant release
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

> 版本號（如 `21.0.10`）需在新環境下用 `brew list --versions openjdk@21` 核對，可能已升版。

---

## 12. Claude Code 權限白名單（`.claude/settings.local.json`）

已驗證過的常用指令模式，新專案可直接複製這份 `permissions.allow` 清單，省去重複授權：

```json
{
  "permissions": {
    "allow": [
      "Bash(npx expo *)",
      "Bash(npm install *)",
      "Bash(npx jest *)",
      "Bash(npx tsc *)",
      "Bash(npm test *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(npx eas *)",
      "Bash(npx eas-cli *)",
      "Bash(adb install *)",
      "Bash(adb devices *)",
      "Bash(java -version)",
      "Bash(./gradlew assembleRelease)",
      "Bash(npx agent-browser *)",
      "Bash(npx playwright *)",
      "Bash(gh auth *)",
      "Bash(gh repo *)"
    ]
  }
}
```

（完整清單見本專案的 `.claude/settings.local.json`；上面只保留跟內容無關、通用性高的部分。）

---

## 13. 資料流分層原則（架構，非檔案）

```
DB / 外部資料來源
  └─ services/     純函式，接受外部依賴作為參數，不持有狀態
       └─ hooks/   封裝 useState + useCallback，提供 reload()
            └─ screens (app/)   消費 hooks，只做 UI 渲染
```

狀態分層：
| 層級 | 工具 | 用途 |
|------|------|------|
| 伺服器/持久狀態 | 依專案（SQLite / API / 其他）+ custom hooks | 資料來源 |
| 全域 UI 狀態 | Zustand | 主題、設定、選取模式等跨頁狀態 |
| 本機元件狀態 | useState | 表單欄位、Modal 開關 |
| 設定持久化 | AsyncStorage | 主題色、字體等使用者偏好 |

命名規範：
| 對象 | 規範 | 範例 |
|------|------|------|
| 變數 / 函式 | camelCase | `getItemById` |
| 型別 / Interface | PascalCase | `Item` |
| React 元件 | PascalCase | `ItemCard.tsx` |
| 常數 | UPPER_SNAKE_CASE | `DEFAULT_THEME_COLOR` |
| Custom Hook | `use` 前綴 | `useItems.ts` |

---

## 排除範圍說明

以下內容**不適用**於新專案，因為是衣櫃 App 業務內容：
- `src/db/schema.ts`、`mockData.web.ts`、`sqlMock.web.ts`（衣櫃資料表結構）
- 所有業務 service/hook/component（`itemService`、`outfitService`、`useRanking` 等）
- `app.json` 裡的 icon/splash/權限文案/bundle identifier 等內容性設定

---

最後更新：2026-06-23（依 SPARKWEAR v2.0.0 當下狀態整理）
