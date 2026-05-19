# Pipeline Monitor — 接入說明

將以下內容貼入你的專案 `CLAUDE.md`，Claude Code 就會自動把執行進度送到 Web UI。

---

## 貼入 CLAUDE.md 的內容

```markdown
## Pipeline Monitor

每次開始或完成一個主要步驟時，用 Bash 送事件給 Web UI（需先啟動 http://localhost:3001）：

步驟開始時：
```bash
curl -s -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d "{\"skill\":\"<步驟名稱>\",\"status\":\"started\",\"data\":{}}"
```

步驟完成時：
```bash
curl -s -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d "{\"skill\":\"<步驟名稱>\",\"status\":\"completed\",\"data\":{\"summary\":\"<簡短描述>\"}}"
```

步驟名稱對照表：
- brainstorming
- using-git-worktrees
- writing-plans
- gap-detection
- candidates-generated
- evaluation-result
- skill-deployed
- subagent-driven-development
- test-driven-development
- requesting-code-review
- finishing-a-development-branch
```

---

## 啟動 Web UI

在送事件之前，先確認 Web UI 已啟動：

```powershell
# 終端 1 — 後端
cd adaptive-superpowers\webapp
npm run dev:server

# 終端 2 — 前端
cd adaptive-superpowers\webapp\client
npm run dev
```

開啟瀏覽器：**http://localhost:5173**

---

## 測試是否連通

```bash
curl -s -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d '{"skill":"brainstorming","status":"started","data":{}}'
```

若瀏覽器 Session Timeline 出現事件，代表接通成功。

---

## API 規格

```
POST http://localhost:3001/api/event
Content-Type: application/json

{
  "skill":  "<步驟名稱>",          // 必填
  "status": "started|completed",   // 必填
  "data":   {}                     // 選填，任意 JSON
}
```

回傳：
```json
{ "ok": true, "event": { "timestamp": "...", "skill": "...", "status": "...", "data": {} } }
```
