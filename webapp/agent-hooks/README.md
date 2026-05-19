# Agent Hooks — 自動串接 Pipeline Monitor

讓 Claude Code 在每次 invoke Skill 時自動送事件到 Web UI，**不用改 CLAUDE.md，不用使用者確認**。

---

## 一次性安裝（每個專案做一次）

把這個資料夾的兩個檔案複製到你要 demo 的專案：

```powershell
# 假設你的專案在 c:\HW\GenAI\Group\hw2\test
mkdir c:\HW\GenAI\Group\hw2\test\.claude
copy webapp\agent-hooks\post-event.sh c:\HW\GenAI\Group\hw2\test\.claude\
copy webapp\agent-hooks\hooks.json    c:\HW\GenAI\Group\hw2\test\.claude\
```

完成後該專案結構：
```
test/
├── CLAUDE.md          ← 可以拿掉 Pipeline Monitor 那段了
└── .claude/
    ├── hooks.json
    └── post-event.sh
```

---

## 運作原理

1. Claude Code 啟動 session 時自動讀 `.claude/hooks.json`
2. 每次 Claude 呼叫 Skill 工具：
   - 呼叫前 → PreToolUse hook 觸發 → `post-event.sh` 送 `started`
   - 完成後 → PostToolUse hook 觸發 → `post-event.sh` 送 `completed`
3. `post-event.sh` 從 stdin 讀取 hook payload，解析 skill 名稱，POST 給 Web UI

**完全自動，不需要 Claude 記得任何事。**

---

## 驗證

啟動 Web UI 後，開 Claude Code 在該專案下，給任意任務（例如「幫我做一個 todo list」），瀏覽器 Session Timeline 應該立刻出現 `brainstorming started`。

---

## 移除

要關掉自動串接，把 `.claude/hooks.json` 改名或刪掉即可。
