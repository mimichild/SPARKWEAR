# Discord Channel 對話與通知 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **注意（非典型計畫）：** 這份計畫的多數步驟需要真人操作瀏覽器（Discord 開發者入口網站）、真人手機（Discord App 收發訊息）、以及在 Claude Code CLI 內互動輸入 slash command——這些都無法由子代理無人值守自動完成。子代理可以「代讀步驟、代跑可執行的 Bash 驗證指令」，但涉及瀏覽器點擊與手機操作的步驟一定要停下來讓使用者本人執行後回報結果。

**Goal:** 讓使用者能在手機 Discord 私訊本機常駐的 Claude Code session 對話，並用 Discord 原生推播作為通知管道。

**Architecture:** 官方 Claude Code Channels 研究預覽功能的 `discord@claude-plugins-official` 外掛，作為 MCP server 透過 stdio 連進手動啟動、帶 `--channels` 旗標的 Claude Code session；session 在中性工作目錄 `~/Documents` 下用 tmux 常駐。

**Tech Stack:** Claude Code CLI（Channels 研究預覽功能）、`discord@claude-plugins-official` 外掛、Discord Developer Portal、tmux。

## Global Constraints

- Bot token 只能存在 `~/.claude/channels/discord/.env`，絕不提交進任何 git repo（來源：spec「Bot Token」與「權限與安全模型」）
- 常駐 session 一律在 `~/Documents` 下啟動，不綁定單一 SPARK 專案（來源：spec「元件」表）
- ~~不加 `--dangerously-skip-permissions`，維持標準工具授權對話框~~（**2026-07-17 執行時變更**：使用者在驗證階段將常駐 session 手動切換為長期 auto mode，知情接受無安全網風險。詳見 spec 的「權限與安全模型」更新）
- 不建立開機自動啟動、launchd 或任何背景 daemon 化機制，純手動啟停（來源：spec「操作模式」）
- 不修改 SPARKWEAR 或任何其他 SPARK 專案的應用程式原始碼（來源：spec「明確排除範圍」）

---

### Task 1: 建立 Discord Application 與 Bot

**Files:** 無（外部帳號設定，不涉及本機檔案）

**Interfaces:**
- Consumes: 無（起始任務）
- Produces: 一組 Discord bot token 字串（人工暫存，Task 3 會用到；不寫入任何檔案或程式碼）

- [ ] **Step 1: 建立 Application**

（🧑 人工操作，瀏覽器）開啟 https://discord.com/developers/applications，點 **New Application**，命名為 `Claude Bridge`（或任何你喜歡的名字），點 **Create**。

- [ ] **Step 2: 建立 Bot 並複製 Token**

（🧑 人工操作，瀏覽器）左側選單點 **Bot**，點 **Reset Token**，複製出現的 token 字串，暫存在密碼管理器或其他安全的地方（此 token 只會完整顯示這一次）。

- [ ] **Step 3: 驗證**

（🧑 人工確認）Bot 分頁最上方應顯示剛建立的 bot 使用者名稱與大頭貼；你手上應該有一串完整的 token 字串可用於 Task 3。

---

### Task 2: 啟用訊息內容意圖並邀請 Bot 進私人伺服器

**Files:** 無

**Interfaces:**
- Consumes: Task 1 建立的 Discord Application
- Produces: 一個只有使用者本人的 Discord 伺服器，Bot 已是該伺服器成員（Task 4 配對時需要）

- [ ] **Step 1: 啟用 Message Content Intent**

（🧑 人工操作，瀏覽器）在同一個 Application 的 **Bot** 分頁，往下捲動到「特權閘道意圖 (Privileged Gateway Intents)」，開啟 **Message Content Intent** 開關，點右下角 **Save Changes**。

- [ ] **Step 2: 產生邀請網址**

（🧑 人工操作，瀏覽器）左側選單點 **OAuth2 → URL Generator**。「SCOPES」勾選 `bot`；出現「BOT PERMISSIONS」後勾選：
- View Channels
- Send Messages
- Send Messages in Threads
- Read Message History
- Attach Files
- Add Reactions

複製頁面下方產生的網址。

- [ ] **Step 3: 建立私人伺服器並邀請 Bot**

（🧑 人工操作，Discord App）如果還沒有一個只有自己的 Discord 伺服器：在 Discord App 點伺服器清單的 `+` → **建立我自己的** → 選「只給我和我的朋友」也可以，之後不用邀任何人進來。開新分頁貼上 Step 2 的邀請網址，選這個伺服器，點 **授權**。

- [ ] **Step 4: 驗證**

（🧑 人工確認）回到 Discord App，這個私人伺服器的成員清單應該出現剛建立的 bot（顯示離線是正常的，外掛還沒啟動）。

---

### Task 3: 安裝並設定 Discord channel 外掛

**Files:**
- Modify（外部，不在 repo 內）: `~/.claude/channels/discord/.env`

**Interfaces:**
- Consumes: Task 1 的 bot token
- Produces: `discord@claude-plugins-official` 外掛已安裝並設定好 token，Task 4 可以用 `--channels plugin:discord@claude-plugins-official` 啟動

- [ ] **Step 1: 新增/更新官方外掛市場**

（在任一 Claude Code session 內執行）

```
/plugin marketplace add anthropics/claude-plugins-official
```

如果回報這個 marketplace 已經存在，屬正常情況，繼續下一步即可。

- [ ] **Step 2: 安裝 Discord 外掛**

```
/plugin install discord@claude-plugins-official
```

Expected: 顯示外掛安裝成功的訊息。若回報「在任何市場中找不到該外掛」，先執行 `/plugin marketplace update claude-plugins-official` 再重試這一步。

- [ ] **Step 3: 重新載入外掛**

```
/reload-plugins
```

Expected: `/discord:configure` 等外掛專屬指令變成可用。

- [ ] **Step 4: 設定 Bot Token**

把 Task 1 拿到的 token 代入，執行：

```
/discord:configure <你的 bot token>
```

- [ ] **Step 5: 驗證 token 已寫入設定檔**

Run:

```bash
test -s ~/.claude/channels/discord/.env && echo "OK: token file exists and non-empty" || echo "FAIL: token file missing or empty"
```

Expected: `OK: token file exists and non-empty`

---

### Task 4: 啟動常駐 session 並完成帳號配對

**Files:** 無

**Interfaces:**
- Consumes: Task 3 設定好的外掛與 token；Task 2 建立的私人伺服器
- Produces: 一個在 tmux 內常駐、帶 `--channels` 啟動的 Claude Code session，Discord 帳號已配對並鎖定 allowlist（Task 5 驗收要用）

- [ ] **Step 1: 開一個專用 tmux session**

Run:

```bash
tmux new -s discord-bridge
```

若尚未安裝 tmux，先執行 `brew install tmux`。

- [ ] **Step 2: 在 tmux 內以 --channels 啟動 Claude Code**

在剛開的 tmux session 裡執行：

```bash
cd ~/Documents
claude --channels plugin:discord@claude-plugins-official
```

Expected: 啟動橫幅下方出現類似「Channels (experimental) messages from plugin:discord@claude-plugins-official inject directly in this session」的提示。

- [ ] **Step 3: 從手機傳訊息觸發配對**

（🧑 人工操作，手機 Discord App）打開私人伺服器成員清單，點 bot → Message，私訊任意文字，例如 `hi`。

Expected: bot 幾秒內回覆一組配對代碼（一段短字串）。

- [ ] **Step 4: 在 Claude Code 內核准配對**

回到 tmux 裡的 Claude Code session，把手機收到的代碼代入，執行：

```
/discord:access pair <配對代碼>
```

Expected: 確認訊息顯示這個 Discord 帳號 ID 已加入允許清單。

- [ ] **Step 5: 鎖定允許清單政策**

```
/discord:access policy allowlist
```

Expected: 確認訊息顯示存取政策已設為 allowlist（之後只有清單內帳號可傳訊息，其他人被無聲丟棄）。

---

### Task 5: 驗證對話、通知與權限模型（對照 spec 驗收標準）

**Files:** 無（測試過程中可能建立臨時檔案，驗證完會清掉）

**Interfaces:**
- Consumes: Task 4 已配對、鎖定 allowlist 的常駐 session
- Produces: 對 spec「驗收標準」四項的逐項確認結果

- [ ] **Step 1: 驗證唯讀對話 + 推播通知**

（🧑 人工操作，手機）私訊 bot 一個唯讀問題，例如：

```
現在 ~/Documents/SPARKWEAR 這個 repo 的 git status 是什麼？
```

Expected: 不需要終端機額外核准，Claude 直接在同一則對話回覆結果；手機 Discord App 對這則回覆跳出原生推播通知。

- [ ] **Step 2: 驗證需授權操作會卡住等本機核准**

（🧑 人工操作，手機）私訊 bot 一個會觸發寫入的請求，例如：

```
在 ~/Documents 建立一個叫 discord-test.txt 的空檔案
```

Expected: 手機端沒有立即回覆。回到 tmux 裡的終端機，會看到標準的 Write 工具核准對話框在等待輸入。在終端機核准後，Claude 才會在 Discord 回覆完成訊息。

- [ ] **Step 3: 清掉測試檔案**

Run:

```bash
rm -f ~/Documents/discord-test.txt
```

- [ ] **Step 4: 驗證允許清單擋掉未配對帳號（可選）**

若手邊有第二支手機或第二個 Discord 帳號：（🧑 人工操作）用該帳號私訊同一個 bot。

Expected: 該帳號收不到任何回覆，Claude session 終端機也不會出現任何新訊息（訊息被無聲丟棄）。

若沒有第二個帳號可測，跳過此步驟，改在 Task 6 的文件中註明此為「已透過官方外掛機制保證、未實機測試」的信任邊界。

---

### Task 6: 撰寫操作手冊文件並提交

**Files:**
- Create: `docs/DISCORD_CHANNEL_SETUP.md`

**Interfaces:**
- Consumes: Task 1–5 的完整設定與驗證結果
- Produces: repo 內可查閱的日常操作說明，供未來重開/troubleshooting 使用

- [ ] **Step 1: 建立操作手冊文件**

建立 `docs/DISCORD_CHANNEL_SETUP.md`，內容如下：

```markdown
# Discord Channel 日常操作手冊

一次性設定與架構設計見 `docs/superpowers/specs/2026-07-17-discord-channel-design.md`。本文件只記錄「怎麼日常啟停」與「出問題怎麼查」。

## 日常啟動

1. 開一個新的 tmux session（或連回舊的）：
   ```bash
   tmux new -s discord-bridge   # 第一次
   tmux attach -t discord-bridge   # 之後重連
   ```
2. 在 tmux 內啟動帶 channel 的 Claude Code：
   ```bash
   cd ~/Documents
   claude --channels plugin:discord@claude-plugins-official
   ```
3. 手機 Discord 私訊你的 bot 即可開始對話；Claude 的回覆會觸發手機原生推播。

## 停止

在 tmux session 內直接離開 Claude Code（Ctrl+C 或 `/exit`）即可斷線。要整個關掉 tmux session：

```bash
tmux kill-session -t discord-bridge
```

## 已知限制

- 沒有權限中繼：Claude 需要授權的操作（Bash／Write／Edit）一律卡在本機終端機核准對話框，手機上看不到、也無法核准。要繼續，必須回電腦按核准。
- 電腦睡眠或關閉 tmux/終端機會中斷連線，需要重新執行「日常啟動」的步驟。
- 沒有開機自動啟動，每次要用都要手動啟動一次。

## Troubleshooting

- **手機傳訊息 bot 沒反應**：確認 Claude Code 是用 `--channels plugin:discord@claude-plugins-official` 啟動的（沒帶這個旗標外掛不會生效）；在 Claude Code 內執行 `/mcp` 檢查 discord 伺服器的連線狀態。
- **找不到外掛**：先執行 `/plugin marketplace update claude-plugins-official` 再重新 `/plugin install discord@claude-plugins-official`。
- **忘記 bot token 存在哪**：`~/.claude/channels/discord/.env`（不要把這個檔案的內容貼到任何地方或提交進 git）。
```

- [ ] **Step 2: 提交文件**

Run:

```bash
git add docs/DISCORD_CHANNEL_SETUP.md
git commit -m "$(cat <<'EOF'
docs: 新增 Discord channel 日常操作手冊

補上 spec 之外的日常啟停指令與 troubleshooting，供之後重開/除錯查閱。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: 驗證 commit 成功**

Run:

```bash
git log --oneline -1
```

Expected: 最新一筆 commit 訊息以 `docs: 新增 Discord channel 日常操作手冊` 開頭。
