# Agent Hooks — 自動串接 Pipeline Monitor

讓 Claude Code 在每次操作時自動送事件到 Web UI，**不用改 CLAUDE.md，不用使用者確認**。
除了 skill 開始/結束，還會自動捕捉**過程資訊**：寫了哪些檔案、做了哪些決策、checklist 進度。

---

## 一次性安裝（每個專案做一次）

把這個資料夾的兩個檔案複製到你要 demo 的專案的 `.claude/` 資料夾：

```powershell
# 假設你的專案在 c:\HW\GenAI\Group\hw2\test
mkdir c:\HW\GenAI\Group\hw2\test\.claude
copy webapp\agent-hooks\post-event.js test\.claude\
copy webapp\agent-hooks\settings.json test\.claude\
```

完成後該專案結構：
```
test/
└── .claude/
    ├── settings.json   ← 專案 hook 設定（Claude Code 自動讀取）
    └── post-event.js   ← 送事件的腳本
```

> **重要**：專案 hook 必須放在 `.claude/settings.json`，不是 `hooks.json`。
> `hooks.json` 是「外掛」用的格式（如 Superpowers 本體），專案層級不會讀取。
> 需要 Node.js（與 webapp 同樣的需求）。Hook 用 Node 寫，跨平台。

---

## 運作原理

1. Claude Code 啟動 session 時自動讀 `.claude/settings.json` 的 `hooks` 設定
2. 每次 Claude 呼叫工具，hook 觸發 `post-event.js`，從 stdin 讀 payload 後 POST 給 Web UI：

| 工具 | 捕捉內容 | 送出 |
|------|---------|------|
| `Skill`（PreToolUse） | skill 開始 | `started` |
| `Write` / `Edit` / `NotebookEdit` | 寫入的檔案路徑 | sub-event `file` |
| `AskUserQuestion` | 問題與答案 | sub-event `question` |
| `TodoWrite` | checklist 進度（done/total + 目前項目） | sub-event `todo` |

3. sub-event 由 server 自動掛到「目前進行中的 skill」底下（最後一個 started 的 skill）

**關於「完成」的時機**：`Skill` 工具載入指令後馬上 return，所以它的 PostToolUse 不代表 skill 真的做完。因此 server 採「**下一個 skill 開始時，才把前一個標記完成**」——一個階段持續 active 到下一個階段開始。最後一個 skill 會維持 active（代表正在進行）。

> 若 agent 只 invoke 了一個 skill（例如只跑 brainstorming 就直接寫檔案，沒有 invoke writing-plans / subagent-driven-development），那所有 sub-event 都會掛在那個 skill 下、且它維持 active——這忠實反映 agent 實際只用了那個 skill。要讓各階段分開呈現，agent 需依序 invoke 對應的工作流 skill。

**完全自動，不需要 Claude 記得任何事。**

---

## 呈現方式

- **Session Timeline**（左欄）：sub-event 縮排顯示在父 skill 下方，可用 header 的「Details」按鈕開關
- **Step Detail Panel**（點擊步驟）：完整列出該 skill 的所有過程（決策、檔案、進度）

---

## 驗證

啟動 Web UI 後，開 Claude Code 在該專案下，給任意任務（例如「幫我做一個 todo list」）。瀏覽器 Session Timeline 應該出現 `brainstorming started`，接著陸續出現決策、檔案等 sub-event。

---

## 移除

要關掉自動串接，把 `.claude/settings.json` 改名或刪掉即可。

---

## 進階：補充階段專屬資料

Hook 自動抓的是通用過程（檔案、決策、進度）。若想加上階段專屬的結構化資料（如 gap 清單、評分、diff），用 `event-detail` 端點補充到已存在的 completed 事件：

```bash
curl -s -X POST http://localhost:3001/api/event-detail \
  -H "Content-Type: application/json" \
  -d "{\"skill\":\"<skill-name>\",\"data\":{\"summary\":\"<摘要>\"}}"
```

這是「補充」性質，不產生新事件，只把 data 合併進該 skill 的 completed 事件。
