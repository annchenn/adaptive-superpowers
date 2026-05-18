# Group 3 Web UI + Demo — 架構規劃設計文件

## Context

本計畫為 `adaptive-superpowers` 專案中 **Group 3（Web UI + Demo）** 的架構設計。

完整 pipeline（Web UI 需全程呈現）：
```
[使用者輸入任務]
      ↓
  brainstorming
      ↓
  writing-plans
      ↓
  [G1] gap-detection → candidates-generated
      ↓
  [G2] evaluation → skill-deployed
      ↓
  subagent-driven-development
      ↓
  verification / git / ...
```

Web UI 定位：**可操控的控制台** + 每個步驟可點擊查看細節。

---

## 執行順序

1. **手動安裝 ui-ux-pro-max-skill**（已完成）
2. **使用 ui-ux-pro-max-skill 規劃 UI 設計**（視覺設計、元件細節、色彩、排版）
3. **依架構規劃實作 webapp**（本文件負責定義架構、資料流、API）

---

## 技術選擇

| 層次 | 選擇 |
|------|------|
| Frontend | React + Vite |
| 即時通訊 | Socket.io（WebSocket，雙向支援控制操作） |
| 後端 | Node.js + Express + Socket.io |
| 圖表 | Recharts（評分長條圖） |
| 檔案監聽 | chokidar（監聽 events.jsonl） |
| UI 設計系統 | Dark Mode OLED（由 ui-ux-pro-max-skill 產生） |

---

## UI 設計系統（由 ui-ux-pro-max-skill 產生）

### Style：Dark Mode (OLED)
深黑底色、高對比文字、極少視覺雜訊，適合開發者工具 / 監控面板。WCAG AAA 等級。

### 色彩 Token
```css
:root {
  --color-background:  #0F172A;  /* 最深底色 */
  --color-primary:     #1E293B;  /* 卡片/面板底色 */
  --color-secondary:   #334155;  /* 次要面板、hover 背景 */
  --color-muted:       #272F42;  /* 分隔線、輕微區塊 */
  --color-border:      #475569;  /* 邊框 */
  --color-foreground:  #F8FAFC;  /* 主要文字 */
  --color-on-primary:  #FFFFFF;  /* 在深色上的文字 */
  --color-accent:      #22C55E;  /* 綠色：執行中/完成/CTA */
  --color-destructive: #EF4444;  /* 紅色：錯誤/gap detected */
  --color-ring:        #1E293B;  /* Focus ring */
}
```

**語意狀態色（Pipeline 步驟）**：
| 狀態 | 顏色 | Token |
|------|------|-------|
| waiting（待執行） | `#475569`（border） | `--color-border` |
| active（執行中） | `#22C55E` + animate-pulse | `--color-accent` |
| completed（完成） | `#22C55E`（實心） | `--color-accent` |
| error / gap | `#EF4444` | `--color-destructive` |
| warning | `#F59E0B` | `--color-warning: #F59E0B` |

### 字體
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

--font-heading: 'Fira Code', monospace;   /* 標題、step name、metric */
--font-body:    'Fira Sans', sans-serif;  /* 說明文字、列表、按鈕 */
```

- Fira Code（等寬）→ pipeline 步驟名稱、時間戳、程式碼類文字
- Fira Sans（無襯線）→ 說明段落、標籤、表格

### 視覺效果
- **Minimal glow**：active 步驟節點加 `text-shadow: 0 0 10px #22C55E`
- **Transition**：所有互動 150–300ms，`ease-out` 進場、`ease-in` 離場
- **Skeleton**：載入超過 300ms 顯示 `animate-pulse` 骨架屏
- **邊框**：卡片用 `border: 1px solid #475569`，active 狀態換 `#22C55E`

### 圖表設計規格（Recharts）

**Evaluation Dashboard（候選評分比較）**：
- 圖表類型：**水平 Grouped Bar Chart**（≤ 5 候選）
- X 軸：分數（0–100）
- Y 軸：候選版本（v1.md, v2.md, v3.md...）
- 分組依據：3 個維度（compliance #22C55E / coverage #3B82F6 / conciseness #F59E0B）
- Winner：額外金色外框 + 👑 icon（lucide-react `Crown`）
- 無資料時：顯示 skeleton shimmer + "等待 G2 評估結果..."
- 輔助功能：value labels 顯示在每個 bar 上、Recharts Legend、CSV export 按鈕

### 動畫規格
| 元素 | 動畫 | 時長 |
|------|------|------|
| Pipeline 步驟完成 | 節點綠色 scale 1.0→1.1→1.0 | 200ms |
| Active 步驟 | `animate-pulse` 持續 | 持續 |
| SessionTimeline 新事件 | 從頂部 slide-in + fade | 250ms |
| StepDetailPanel 展開 | 右側 slide-in（translateX） | 300ms |
| ControlPanel 按鈕點擊 | scale 0.95 → 1.0 | 150ms |

### 反模式（避免）
- 不使用 emoji 當 icon（用 lucide-react）
- 不使用 light mode
- 不使用 raw hex 直接寫在元件中（必須用 CSS variable）
- 不讓 pipeline 節點在 active 時影響周圍 layout（只改顏色/shadow）

---

## 目錄結構

```
adaptive-superpowers/
├── events.jsonl              ← append-only 事件 log
├── evaluation-log.json       ← G2 評估結果
├── hooks/
│   ├── hooks.json            ← 修改：加入 PreToolUse/PostToolUse hooks
│   ├── log-event.sh          ← 新增：寫入 events.jsonl
│   ├── session-start         ← 已有
│   └── run-hook.cmd          ← 已有
└── webapp/
    ├── package.json
    ├── web.md                ← 本設計文件
    ├── server/
    │   ├── index.js          ← Express + Socket.io
    │   └── mock-events.js    ← Week 1 假資料
    └── client/
        ├── index.html
        ├── vite.config.js
        └── src/
            ├── main.jsx
            ├── App.jsx
            └── components/
                ├── PipelineFlow.jsx          ← 完整流程圖（可點擊節點）
                ├── StepDetailPanel.jsx       ← 步驟細節面板（點擊後展開）
                ├── SessionTimeline.jsx       ← 即時事件時間軸
                ├── GapDetectionPanel.jsx     ← Gap 偵測結果
                ├── EvaluationDashboard.jsx   ← 評分長條圖（Recharts）
                ├── SkillLibrary.jsx          ← 目前 Skill 庫列表
                └── ControlPanel.jsx          ← 操控按鈕（觸發各步驟）
```

---

## 介面契約

### events.jsonl（所有 skill 事件 + G1/G2 特殊事件）
```jsonc
// 一般 skill 事件（hooks 自動記錄）
{ "timestamp": "...", "skill": "brainstorming", "status": "started", "data": {} }
{ "timestamp": "...", "skill": "writing-plans", "status": "completed",
  "data": { "plan_summary": "...", "steps": ["step1", "step2"] } }

// G1 事件
{ "timestamp": "...", "skill": "gap-detection", "status": "completed",
  "data": { "gaps": [{ "name": "data-migration", "description": "需要處理 schema 變更" }] } }
{ "timestamp": "...", "skill": "candidates-generated", "status": "completed",
  "data": { "skill": "data-migration", "count": 3,
            "files": ["candidates/data-migration/v1.md", "v2.md", "v3.md"] } }

// G2 事件
{ "timestamp": "...", "skill": "evaluation-result", "status": "completed",
  "data": { "winner": "v2.md",
            "scores": { "v1": { "compliance": 30, "coverage": 22, "conciseness": 20, "total": 72 },
                        "v2": { "compliance": 38, "coverage": 28, "conciseness": 22, "total": 88 } } } }
{ "timestamp": "...", "skill": "skill-deployed", "status": "completed",
  "data": { "skill": "data-migration", "version": "v2.md", "diff_preview": "..." } }
```

### evaluation-log.json（G2 寫入，G3 讀取）
```jsonc
{ "skill": "data-migration",
  "candidates": [
    { "file": "v1.md", "scores": { "compliance": 30, "coverage": 22, "conciseness": 20 }, "total": 72 }
  ],
  "winner": "v2.md" }
```

---

## 元件職責（UI 設計細節交由 ui-ux-pro-max-skill 決定）

### PipelineFlow
- 功能：顯示完整 pipeline 所有步驟，每個節點**可點擊**
- 資料來源：Socket.io events，根據最新事件決定各步驟狀態（waiting / active / completed）
- 互動：點擊節點 → 觸發 `onStepSelect(stepName)` → 右側展開 StepDetailPanel

### StepDetailPanel
- 功能：展示被點擊步驟的所有細節
- 每個步驟顯示的細節：

| 步驟 | 細節內容 |
|------|---------|
| brainstorming | 觸發時間、執行時長 |
| writing-plans | 計畫摘要、步驟列表（data.steps） |
| gap-detection | 缺口清單（名稱 + 描述）|
| candidates-generated | 候選版本列表、生成數量 |
| evaluation-result | 三維分數（compliance/coverage/conciseness）、winner 標示 |
| skill-deployed | 部署版本、diff preview |
| subagent-driven-dev | 執行子任務列表 |

- UI 設計（滑出方式、配色、typography）由 ui-ux-pro-max-skill 決定

### SessionTimeline
- 功能：即時顯示所有事件的時間軸
- 資料來源：Socket.io `new-event` + 初次載入 `/api/events`
- 每筆顯示：時間戳 + skill 名稱 + status（彩色徽章）

### EvaluationDashboard
- 功能：Recharts BarChart 顯示各候選版本分數
- 資料來源：`/api/evaluation-log`
- Winner 特別標示（設計細節由 skill 決定）

### ControlPanel
- 功能：操控按鈕，觸發後端 POST 端點
  - Trigger Gap Detection → `POST /api/control/gap-detection`
  - Run Evaluation → `POST /api/control/evaluate`
  - Approve Deployment → `POST /api/control/deploy`

### SkillLibrary
- 功能：顯示目前 skills/ 目錄下的 skill 清單
- 資料來源：`/api/skills`
- 新部署 skill 標記「NEW」

---

## 後端 API 端點（server/index.js）

| 方法 | 路徑 | 功能 |
|------|------|------|
| GET | `/api/events` | 回傳完整 events.jsonl 歷史 |
| GET | `/api/evaluation-log` | 讀取 evaluation-log.json |
| GET | `/api/skills` | 列出 skills/ 目錄下所有 skill |
| GET | `/api/step-detail/:skill` | 回傳特定步驟的詳細事件資料 |
| POST | `/api/control/gap-detection` | 觸發 gap detection |
| POST | `/api/control/evaluate` | 觸發評估 |
| POST | `/api/control/deploy` | 核准部署 |

Socket.io 事件：
- Server → Client：`new-event`（payload: 新的 event 物件）
- Server → Client：`step-update`（payload: 步驟狀態更新）

---

## Event Logging Hooks

### hooks/log-event.sh（新增）
```bash
#!/bin/bash
SKILL=$1; STATUS=$2; DATA=${3:-"{}"}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "{\"timestamp\":\"$TIMESTAMP\",\"skill\":\"$SKILL\",\"status\":\"$STATUS\",\"data\":$DATA}" \
  >> "$REPO_ROOT/events.jsonl"
```

### hooks/hooks.json（修改）
加入 PreToolUse / PostToolUse 在 Skill tool 呼叫時記錄：
```json
"PreToolUse":  [{ "matcher": "Skill", "hooks": [{ "type": "command", "command": "...log-skill-start", "async": true }] }],
"PostToolUse": [{ "matcher": "Skill", "hooks": [{ "type": "command", "command": "...log-skill-end",   "async": true }] }]
```

---

## 整合時間表

| 週次 | 任務 |
|------|------|
| Week 1 | 安裝 skill → 使用 ui-ux-pro-max-skill 設計 UI → hooks + mock 資料 + webapp 骨架 |
| Week 2 | 完成所有元件 + StepDetailPanel + 接 events.jsonl 真實資料 |
| Week 3 | 接 G1/G2 真實事件 + 整合測試 |
| Week 4 | 端對端測試 + Demo 影片 + 現場展示 |

---

## 驗證方式

1. **事件記錄**：`bash hooks/log-event.sh writing-plans completed '{"steps":["t1","t2"]}'` → SessionTimeline 更新
2. **步驟點擊**：點擊 writing-plans 節點 → StepDetailPanel 顯示步驟列表
3. **評估圖表**：建立測試 evaluation-log.json → Recharts 顯示分組長條圖
4. **端對端**（Week 3）：真實 Claude Code + Superpowers → UI 全程即時呈現
