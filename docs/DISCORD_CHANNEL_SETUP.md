# Discord Channel 日常操作手冊

一次性設定與架構設計見 `docs/superpowers/specs/2026-07-17-discord-channel-design.md`。本文件記錄「怎麼日常啟停」「出問題怎麼查」，以及實際設定過程中踩到的坑。

## 前置需求

- **Bun**：`discord@claude-plugins-official` 外掛是 Bun 腳本，沒裝會導致 `/mcp` 顯示 `plugin:discord:discord · failed`，且完全不會有任何 pairing 訊息。安裝：
  ```bash
  brew install bun
  ```
  裝完一定要把當時執行 `claude --channels ...` 的 session 整個關掉重開（`/exit` 或 Ctrl+C 後重新執行指令），單純重試指令沒用。

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
3. **切換 auto mode**：這個 session 長期以 auto mode（跳過工具授權確認）執行，手機下指令會直接執行寫檔/跑指令，不會停下來等本機核准。啟動後在 CLI 內切換到 auto mode（Shift+Tab 循環權限模式，或依當時版本的 UI 提示操作）。
4. 手機 Discord 私訊你的 bot 即可開始對話；Claude 的回覆會觸發手機原生推播。

## 停止

在 tmux session 內直接離開 Claude Code（Ctrl+C 或 `/exit`）即可斷線。要整個關掉 tmux session：

```bash
tmux kill-session -t discord-bridge
```

## 權限模式：長期 auto mode（風險自負）

這個常駐 session 刻意設成 auto mode，跟一般 Claude Code 保守默認不同：

- 好處：手機上下指令，讀檔、寫檔、跑指令都直接執行，完全不用回電腦按核准
- 代價：**沒有安全網**。Claude 誤判需求或指令描述模糊時，會直接寫檔/刪檔/執行指令，不會先問過你
- 這是知情後的長期選擇（2026-07-17 確認），不是通用建議做法。如果之後想改回保守模式，這個 session 不要切 auto mode，讓工具授權對話框正常出現即可

## 已知限制

- 沒有權限中繼：即使不開 auto mode，Discord 官方外掛本身也未內建權限中繼，遠端無法核准/拒絕工具使用提示，只能在本機終端機處理
- 電腦睡眠或關閉 tmux/終端機會中斷連線，需要重新執行「日常啟動」的步驟
- 沒有開機自動啟動，每次要用都要手動啟動一次
- 非配對帳號會被 allowlist 擋掉（已用配對機制驗證過），但沒有實機測試第二個帳號被拒絕的情境——理論上有官方外掛的寄件者允許清單保證，未實測

## Troubleshooting

- **`/mcp` 顯示 `plugin:discord:discord · failed`**：先確認 `bun --version` 有輸出；沒有就 `brew install bun` 後完整重開 session（見上方「前置需求」）。如果 Bun 已安裝仍然 failed，用 `--debug` 重新啟動看即時錯誤：
  ```bash
  claude --debug --channels plugin:discord@claude-plugins-official
  ```
  Debug log 路徑會印在啟動畫面（`~/.claude/debug/<session-id>.txt`）。實測遇過一次是 debug log 顯示 `Cannot acquire lock ... NON-FATAL: Lock acquisition failed ... (expected in multi-process scenarios)`——這通常代表同時有其他 Claude Code process 在跑，屬非致命訊息，重新啟動一次通常就會連上。
- **手機傳訊息 bot 沒反應**：確認 Claude Code 是用 `--channels plugin:discord@claude-plugins-official` 啟動的（沒帶這個旗標外掛不會生效）；`/mcp` 檢查 discord 伺服器狀態是否為 connected。
- **找不到外掛**：先執行 `/plugin marketplace update claude-plugins-official` 再重新 `/plugin install discord@claude-plugins-official`。
- **忘記 bot token 存在哪**：`~/.claude/channels/discord/.env`（不要把這個檔案的內容貼到任何地方或提交進 git）。
- **想確認允許清單/配對狀態**：`/discord:configure`（不帶參數）會印出目前的 token 設定狀態與允許清單摘要。
