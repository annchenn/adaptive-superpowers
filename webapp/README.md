# Group 3 — Superpowers Pipeline Monitor

即時視覺化整個 Superpowers pipeline 執行狀態的 Web UI。

---

## 快速啟動

**1. 安裝依賴**（只需一次）
```powershell
cd adaptive-superpowers\webapp && npm install
cd client && npm install
```

**2. 開啟三個終端**

終端 1 — 後端 port 3001
```powershell
cd webapp && npm run dev:server
```

終端 2 — 前端 port 5173
```powershell
cd webapp\client && npm run dev
```

終端 3 — 模擬完整 pipeline
```bash
bash demo.sh
```

**3. 開瀏覽器**：http://localhost:5173

---

## 串接 AI Agent

將以下內容加入你的 `CLAUDE.md`，Claude Code 就會自動送事件到 Web UI：

```
## Pipeline Monitor

The Web UI at http://localhost:3001 is running. You MUST call the following curl commands at these exact moments. This is MANDATORY, not optional. Do not skip these calls.

1. RIGHT BEFORE invoking any skill:
curl -s -X POST http://localhost:3001/api/event -H "Content-Type: application/json" -d "{\"skill\":\"<skill-name>\",\"status\":\"started\",\"data\":{}}"

2. RIGHT AFTER a skill completes:
curl -s -X POST http://localhost:3001/api/event -H "Content-Type: application/json" -d "{\"skill\":\"<skill-name>\",\"status\":\"completed\",\"data\":{}}"

Skill name mapping:
- About to invoke brainstorming → skill: "brainstorming"
- About to invoke using-git-worktrees → skill: "using-git-worktrees"
- About to invoke writing-plans → skill: "writing-plans"
- About to invoke gap-detection → skill: "gap-detection"
- About to invoke candidates-generated → skill: "candidates-generated"
- About to invoke evaluation-result → skill: "evaluation-result"
- About to invoke skill-deployed → skill: "skill-deployed"
- About to invoke subagent-driven-development → skill: "subagent-driven-development"
- About to invoke test-driven-development → skill: "test-driven-development"
- About to invoke requesting-code-review → skill: "requesting-code-review"
- About to invoke finishing-a-development-branch → skill: "finishing-a-development-branch"
```

**測試連通：**
```bash
curl -s -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d '{"skill":"brainstorming","status":"started","data":{}}'
```
瀏覽器 Session Timeline 出現事件 → 接通成功。

---

## 接上 G1 / G2 真實資料

**G1、G2 送事件：**
```bash
bash hooks/log-event.sh <skill-name> <started|completed> '<json-data>'
```

**G2 寫入評估結果**（`evaluation-log.json`）：
```json
{
  "skill": "my-skill",
  "winner": "v2.md",
  "candidates": [
    { "file": "v1.md", "scores": { "compliance": 30, "coverage": 22, "conciseness": 20 }, "total": 72 },
    { "file": "v2.md", "scores": { "compliance": 38, "coverage": 28, "conciseness": 22 }, "total": 88 }
  ]
}
```

---

詳細架構設計（技術選型、元件職責、API 端點、介面契約）見 [`WEB.md`](WEB.md)。

詳細進度與待辦事項見 [`PROGRESS.md`](PROGRESS.md)。
