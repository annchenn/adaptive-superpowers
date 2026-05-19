# Group 3 Web UI — 啟動與操作指南

## 環境需求

- Node.js ≥ 18
- npm ≥ 9
- Git Bash / WSL（執行 `demo.sh`）
- 瀏覽器（Chrome / Edge）

---

## 安裝依賴

```powershell
# 在 webapp/ 目錄下執行（只需執行一次）
cd adaptive-superpowers\webapp
npm install

cd client
npm install
```

---

## 啟動方式

需要同時開啟三個終端視窗。

### 終端 1 — 後端伺服器（Node.js + Socket.io）

```powershell
cd adaptive-superpowers\webapp
npm run dev:server
```

伺服器啟動後會顯示：
```
[server] listening on http://localhost:3001
[watcher] watching: .../events.jsonl
```

> **Mock 模式**（不需要真實 events.jsonl，用假資料）：
> ```powershell
> npm run mock
> ```

### 終端 2 — 前端開發伺服器（React + Vite）

```powershell
cd adaptive-superpowers\webapp\client
npm run dev
```

啟動後開啟瀏覽器：**http://localhost:5173**

---

## 執行 Demo 腳本（模擬完整 pipeline）

### 終端 3 — Git Bash 或 WSL

```bash
# 切換到 adaptive-superpowers 根目錄
cd /c/HW/GenAI/Group/hw2/adaptive-superpowers

bash demo.sh
```

腳本會依序注入 **11 個 pipeline 步驟**，每步之間有 2–5 秒延遲，讓你在瀏覽器看到即時更新。

---

## 完整流程（三個終端同時開啟後）

```
終端 1: npm run dev:server   → 後端 port 3001
終端 2: npm run dev          → 前端 port 5173
終端 3: bash demo.sh         → 注入事件到 events.jsonl
```

開啟 http://localhost:5173，在 demo.sh 執行期間觀察：

| UI 區域 | 呈現內容 |
|---------|---------|
| 左欄 Session Timeline | 每個事件即時出現（帶時間戳） |
| 中欄 Pipeline Flow | 11 個步驟依序從灰色 → 綠色 |
| 右欄 Gap Detection Panel | G1 偵測到的 2 個缺口 |
| 右欄 Evaluation Dashboard | v1/v2/v3 分數長條圖，v2 獲勝 |
| 右欄 Skill Library | 新部署的 skill 出現 [NEW] 標籤 |
| 右欄 Step Detail | 點擊任意 pipeline 節點查看細節 |

---

## 串接 AI Agent（Claude Code）

讓你的 Claude Code session 自動把執行進度送到 Web UI，只需把以下內容貼入你的專案 `CLAUDE.md`：

```markdown
## Pipeline Monitor

每次開始或完成一個主要步驟時，用 Bash 送事件給 Web UI（需先啟動 http://localhost:3001）：

步驟開始時：
curl -s -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d "{\"skill\":\"<步驟名稱>\",\"status\":\"started\",\"data\":{}}"

步驟完成時：
curl -s -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d "{\"skill\":\"<步驟名稱>\",\"status\":\"completed\",\"data\":{\"summary\":\"<簡短描述>\"}}"

步驟名稱對照：brainstorming、using-git-worktrees、writing-plans、gap-detection、
candidates-generated、evaluation-result、skill-deployed、subagent-driven-development、
test-driven-development、requesting-code-review、finishing-a-development-branch
```

**測試是否連通：**
```bash
curl -s -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d '{"skill":"brainstorming","status":"started","data":{}}'
```
瀏覽器 Session Timeline 出現事件即代表接通。

---

## 接上真實 G1/G2 資料

### events.jsonl（G1、G2 均需 append）

```bash
bash hooks/log-event.sh <skill-name> <started|completed> '<json-data>'

# 範例
bash hooks/log-event.sh gap-detection completed '{"gaps":[{"name":"my-skill","description":"..."}]}'
```

### evaluation-log.json（G2 寫入）

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

## 指令速查

| 指令 | 說明 |
|------|------|
| `npm run dev:server` | 啟動後端（真實模式） |
| `npm run mock` | 啟動後端（假資料模式） |
| `npm run dev` | 啟動前端（在 client/ 目錄下） |
| `npm run build` | 打包前端（在 client/ 目錄下） |
| `bash demo.sh` | 執行 11 步完整 demo |

---

## 常見問題

**Q: 畫面一片空白？**
開啟瀏覽器 DevTools（F12）→ Console，確認是否有 JS 錯誤。確認後端已在 port 3001 啟動。

**Q: Socket 顯示 Disconnected？**
確認 `npm run dev:server` 正在執行，且沒有防火牆擋住 port 3001。

**Q: demo.sh 找不到 log-event.sh？**
確認你在 Git Bash 中執行，且路徑中有 `adaptive-superpowers/hooks/log-event.sh`。
