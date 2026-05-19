# Group 3 — Web UI + Demo 進度追蹤

> 分支：`webapp`
> 最後更新：2026-05-19

---

## 已完成

### 基礎建設

- [x] **Event Logging Hooks**
  - `hooks/log-event.sh` — 將事件 append 至 `events.jsonl`
  - `hooks/log-event` — 解析 Claude Code hook payload，呼叫 log-event.sh
  - `hooks/hooks.json` — 加入 PreToolUse / PostToolUse 自動記錄 Skill 呼叫

- [x] **後端伺服器** (`webapp/server/index.js`)
  - Express + Socket.io，port 3001
  - chokidar 監聽 `events.jsonl`，有新行即推送 `new-event`
  - REST API：`/api/events`、`/api/evaluation-log`、`/api/skills`、`/api/step-detail/:skill`
  - 控制 API：`POST /api/control/gap-detection|evaluate|deploy`
  - Mock 模式（`MOCK=true`）：使用 `server/mock-events.js` 假資料

- [x] **前端架構** (`webapp/client/`)
  - React + Vite，port 5173
  - Dark Mode OLED 設計系統（CSS custom properties，Fira Code + Fira Sans）
  - ErrorBoundary 保護各元件，避免單一元件崩潰造成空白頁

### UI 元件

- [x] **PipelineFlow** — 11 步完整流程圖（可點擊節點）
  - 包含標準 Superpowers 工作流（brainstorming → git-worktree → writing-plans → ... → finish-branch）
  - G1、G2 自適應步驟有彩色 badge 標示
  - 狀態：waiting / active（閃爍）/ completed / error / warning

- [x] **SessionTimeline** — 即時事件時間軸
  - Socket.io 推送，自動捲動至最新
  - 彩色 status badge，slide-in 動畫

- [x] **StepDetailPanel** — 步驟細節側板
  - 點擊 pipeline 節點展開，11 個步驟各有專屬渲染器
  - 顯示：執行時長、計畫步驟、gap 清單、候選檔案、評分表格、diff 預覽、進度條等

- [x] **EvaluationDashboard** — G2 評分視覺化
  - Recharts 橫向長條圖（compliance / coverage / conciseness）
  - Winner ♛ 標示、CSV 匯出
  - 有資料才顯示（不佔位）

- [x] **GapDetectionPanel** — G1 缺口清單
  - 過濾 gap-detection / gap-detected 事件，列出缺口名稱與描述

- [x] **SkillLibrary** — Skill 庫列表
  - 讀取 `/api/skills`，新部署的 skill 顯示 [NEW] 標籤

- [x] **ControlPanel** — 操控按鈕
  - Trigger Gap Detection / Run Evaluation / Approve Deployment
  - 每個按鈕有獨立 loading 狀態與 toast 回饋

### 其他

- [x] **demo.sh** — 自動化 demo 腳本
  - 依序注入 11 個 pipeline 步驟（含延遲）
  - 涵蓋：brainstorming、git-worktree、writing-plans、G1 gap + candidates、G2 evaluation + deploy、execution、TDD、code review、finish branch

- [x] **webapp/web.md** — 架構設計文件
- [x] **webapp/HOWTO.md** — 啟動與操作指南

---

## 待辦事項

### 高優先（整合前必須完成）

- [x] **串接 AI Agent**
  - `POST /api/event` 端點：server 收到後寫入 events.jsonl + emit socket
  - `MONITOR.md`：使用者把內容貼入自己的 CLAUDE.md，Claude Code 自動送事件
  - 驗收：`curl -X POST http://localhost:3001/api/event ...` → 瀏覽器即時出現事件

- [ ] **接上 G1 真實 events.jsonl**
  - 確認 G1 寫入的事件格式與 `events.jsonl` 規範一致（見 `web.md` 介面契約）
  - 測試：gap-detection、candidates-generated 事件能在 UI 正確顯示

- [ ] **接上 G2 真實 evaluation-log.json**
  - 確認 G2 寫入的 JSON 格式符合 `{ skill, candidates: [{file, scores, total}], winner }`
  - 測試：EvaluationDashboard 能顯示真實評分資料

- [ ] **接上 G2 真實 events.jsonl**
  - evaluation-result、skill-deployed 事件能在 pipeline 與 timeline 顯示

### 中優先（Demo 品質）

- [ ] **demo 影片錄製**（project-groups.md 驗收標準）
  - 時長 3–5 分鐘
  - 涵蓋：brainstorming → gap detection → 3 個候選生成 → 評分 → winner 部署 → 新 skill 觸發

- [ ] **現場 Demo 準備**
  - 準備一個固定 demo 任務（會觸發 gap 的情境）
  - 準備預錄備用影片（live demo 失敗時使用）
  - 準備系統架構簡報

- [ ] **hooks 自動觸發測試**
  - 驗證 Claude Code 實際使用 Skill 時，`hooks/hooks.json` 的 PreToolUse/PostToolUse 有正確寫入 events.jsonl

### 低優先（Nice to have）

- [ ] **前端效能**：bundle 目前 629KB，可考慮 lazy import Recharts
- [ ] **深色/淺色主題切換**（目前固定 OLED 深色）
- [ ] **ControlPanel 按鈕真正觸發 G1/G2**（目前只回傳 `{ ok: true }`，無實際執行）
- [ ] **行動裝置 RWD 調整**

---

## 驗收標準對照（project-groups.md）

| 驗收項目 | 狀態 |
|---------|------|
| Web UI 能即時顯示 pipeline 當前步驟 | ✅ 完成 |
| Evaluation Dashboard 能顯示候選分數比較 | ✅ 完成 |
| Demo 影片錄製完成（3–5 分鐘） | ⬜ 待辦 |
| 現場 demo 能跑通完整流程 | ⬜ 待確認（依賴 G1/G2 整合） |

---

## 介面契約（與 G1/G2 約定）

### G1、G2 → Group 3（events.jsonl）

```bash
# 每個事件 append 一行
bash hooks/log-event.sh <skill-name> <started|completed> '<json>'
```

| skill 名稱 | 觸發時機 | data 欄位 |
|-----------|---------|-----------|
| `gap-detection` | G1 偵測完成 | `{ gaps: [{name, description}] }` |
| `candidates-generated` | G1 生成完成 | `{ skill, count, files: [] }` |
| `evaluation-result` | G2 評估完成 | `{ winner, scores: { v1: {...}, v2: {...} } }` |
| `skill-deployed` | G2 部署完成 | `{ skill, version, diff_preview }` |

### G2 → Group 3（evaluation-log.json）

```json
{
  "skill": "<skill-name>",
  "winner": "v2.md",
  "candidates": [
    { "file": "v1.md", "scores": { "compliance": 30, "coverage": 22, "conciseness": 20 }, "total": 72 }
  ]
}
```
