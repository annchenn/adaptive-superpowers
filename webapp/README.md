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

| 終端 | 指令 | 說明 |
|------|------|------|
| 1 | `cd webapp && npm run dev:server` | 後端 port 3001 |
| 2 | `cd webapp\client && npm run dev` | 前端 port 5173 |
| 3 | `bash demo.sh` | 模擬完整 pipeline |

**3. 開瀏覽器**：http://localhost:5173

---

## 串接 AI Agent

將以下內容加入你的 `CLAUDE.md`，Claude Code 就會自動送事件到 Web UI：

```
每次開始或完成主要步驟時，執行：

開始：curl -s -X POST http://localhost:3001/api/event -H "Content-Type: application/json" -d "{\"skill\":\"<步驟名>\",\"status\":\"started\",\"data\":{}}"
完成：curl -s -X POST http://localhost:3001/api/event -H "Content-Type: application/json" -d "{\"skill\":\"<步驟名>\",\"status\":\"completed\",\"data\":{}}"

步驟名稱：brainstorming | using-git-worktrees | writing-plans | gap-detection |
candidates-generated | evaluation-result | skill-deployed | subagent-driven-development |
test-driven-development | requesting-code-review | finishing-a-development-branch
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

詳細進度與待辦事項見 [`PROGRESS.md`](PROGRESS.md)。
