# Discord Channel 設計 — 用 Discord 跟 Claude Code 對話與接收通知

日期：2026-07-17

## 背景與目的

目前跟 Claude Code 互動只能坐在電腦前透過終端機。目標是能在手機上用 Discord 私訊，向本機正在跑的 Claude Code session 提問、查狀態，並收到回覆——同時把 Discord app 本身的推播通知當作「收到 Claude 通知」的管道，不需要另外建通知系統。

這個功能跟 SPARKWEAR App 本身的程式碼無關，是 Claude Code 工具鏈層級的個人工作流程設定，屬於一次性設定 + 少量操作說明，不涉及應用程式原始碼異動。

## 選用方案

採用 Claude Code 官方研究預覽功能 **Channels** 的 Discord 外掛（`discord@claude-plugins-official`）。

**為什麼不自建（channels-reference 教的自訂 MCP webhook server）**：官方外掛已內建 `reply`／`react`／`fetch_messages`／`download_attachment` 工具、配對流程、寄件者允許清單。自建等於重造輪子，還得自己處理寄件者過濾（防 prompt injection）與 Discord API 輪詢，沒有額外好處。

**為什麼不用 bypassPermissions**：能做到手機下指令就直接執行，不用回電腦核准，但只要 Claude 誤判或指令模糊，就沒有任何安全網會直接寫檔/執行指令。保守默認換來的代價是「改代碼類工作仍要回電腦」，可接受。

## 架構

```
手機 Discord App（私訊自己的 bot）
        ↕ Discord Bot API（外掛輪詢）
本機 Discord channel 外掛（MCP server, stdio 連線）
        ↕
常駐的 Claude Code session
（手動在 ~/Documents 下以 --channels 啟動）
        ↕
本機檔案系統（含所有 SPARK 專案）
```

全程在本機 Mac 處理，Discord 只負責訊息中繼，Claude 直接讀寫本機檔案，不經過任何雲端沙箱。

## 元件

| 元件 | 說明 |
|---|---|
| Discord Bot | 在 [Discord 開發者入口網站](https://discord.com/developers/applications) 建立，僅供本人使用 |
| 私人 Discord 伺服器 | 專門建一個只有自己的伺服器，把 bot 邀進去；Discord bot 需與使用者同在至少一個伺服器才能收 DM |
| `discord@claude-plugins-official` 外掛 | Claude Code 官方外掛，處理配對、允許清單、訊息轉發 |
| Bot Token | 存於 `~/.claude/channels/discord/.env`，不進版控 |
| 常駐 session 工作目錄 | `~/Documents`（中性通用目錄，可自由 `cd` 到任何 SPARK 專案） |

## 設定步驟

1. Discord 開發者入口網站：建立新 App，Bot 分頁建立 bot、重設並複製 token
2. Bot 設定 → 特權閘道意圖 → 啟用「訊息內容意圖」
3. OAuth2 → URL Generator：勾選 `bot` scope，權限勾「檢視頻道／傳送訊息／在執行緒中傳送訊息／讀取訊息歷史記錄／附加檔案／新增反應」，用產生的網址把 bot 邀進私人伺服器
4. Claude Code 內執行 `/plugin install discord@claude-plugins-official`，若找不到外掛先 `/plugin marketplace update claude-plugins-official`
5. `/reload-plugins`
6. `/discord:configure <token>`
7. 結束 Claude Code，改用 `claude --channels plugin:discord@claude-plugins-official` 在 `~/Documents` 下重新啟動
8. Discord 私訊 bot 任意訊息，bot 回配對碼；回到終端機執行 `/discord:access pair <code>`
9. `/discord:access policy allowlist`，鎖定只有自己的帳號可傳訊息

## 操作模式（持續運作）

純手動、不做開機自動啟動或 daemon 化：

- 想用的時候，在終端機（建議包一層 `tmux`/`screen`，避免關掉終端機視窗連線就斷）執行步驟 7 的指令
- session 開著期間，Discord 私訊會被轉發進這個 session，Claude 處理完用 `reply` 工具回覆，觸發手機 Discord 原生推播
- 關閉終端機或電腦睡眠會中斷連線，之後要用再手動重開

## 權限與安全模型

- **寄件者允許清單**：只有配對過的自己帳號 ID 可以傳訊息，其他人私訊 bot 會被無聲丟棄，防止陌生人或 prompt injection 透過 Discord 注入指令
- **維持標準權限確認**：讀檔、查狀態、討論這類唯讀操作可在 Discord 上直接完成；一旦 Claude 需要用 Bash／Write／Edit 等需授權的工具，本機終端機的核准對話框仍會開啟並等待——Discord 官方外掛未內建權限中繼（permission relay），所以無法在手機上核准或拒絕。這是刻意保留的限制，真正的改代碼工作仍留到回電腦前處理
- Bot token 只存在 `~/.claude/channels/discord/.env`，不提交進 git

## 明確排除範圍（Out of scope）

- 不做權限中繼（remote 核准/拒絕工具使用）
- 不做多專案多 bot 架構（一個 bot 對應一個通用工作目錄即可）
- 不做開機自動啟動、launchd、或任何背景 daemon 化
- 不修改 SPARKWEAR 或其他 SPARK 專案的應用程式原始碼

## 驗收標準

- 能在手機 Discord 私訊 bot 一個問題，本機常駐 session 收到、處理，並在同一則對話回覆
- 手機 Discord app 對該回覆跳原生推播通知
- 非配對帳號私訊 bot 不會被轉發進 Claude session
- Claude 嘗試唯讀操作（讀檔、查 git log 等）不需額外確認即可完成；嘗試寫檔/執行指令時，本機終端機出現標準核准對話框
