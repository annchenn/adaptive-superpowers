# Final Project 分組分工

## 系統概覽

本專案在 Superpowers 原有 pipeline 上增加三個新功能模組：
1. 自動偵測 skill 缺口並生成多候選 skill
2. 自動評估 skill 品質並選出最佳版本
3. Web UI 視覺化整個執行流程

```
原有流程：
  brainstorming → writing-plans → subagent-driven-development → ...

新增流程（在 writing-plans 之後）：
  writing-plans
      ↓
  [Group 1] 缺口偵測 → 生成 N 個候選 skill
      ↓
  [Group 2] 評估每個候選 → 選出最佳 → 加入 skill 庫
      ↓
  subagent-driven-development（帶著新 skill 繼續執行）

[Group 3] Web UI 全程監控以上所有步驟
```

---

## Group 1：Skill Gap Detection + Multi-candidate Generation

### 負責範圍
在計畫階段自動偵測 skill 缺口，並針對缺口生成多個候選 SKILL.md 供評估使用。

### 改動檔案
| 檔案 | 動作 |
|------|------|
| `skills/writing-plans/SKILL.md` | 加入 gap detection 步驟 |
| `skills/writing-skills/SKILL.md` | 改為多 candidate 生成流程 |
| `skills/skill-gap-detection/SKILL.md` | 新增 skill（偵測邏輯） |
| `scripts/generate-candidates.sh` 或 `.py` | 批量生成候選 skill 的腳本 |

### 詳細任務

**1. Gap Detection（偵測缺口）**
- 在 `writing-plans` 流程末端加一個審視步驟
- AI 逐一檢查計畫裡的每個 task，對照現有 skill 庫（`~/.claude/skills/` 的 SKILL.md 清單）
- 判斷標準：「這個 task 有沒有對應的 skill 可以引導 AI 執行？」
- 輸出：需要補充的 skill 清單（每個缺口寫清楚：情境描述、預期行為）

**2. Multi-candidate Generation（生成候選）**
- 對每個缺口，呼叫 LLM 生成 3–5 個不同的候選 SKILL.md
- 每個候選要有不同的切入角度（例如：強調流程 vs 強調禁止事項 vs 強調範例）
- 輸出格式統一：`candidates/<skill-name>/v1.md`, `v2.md`, `v3.md`...

**3. 介面定義（供 Group 2 串接）**
```
Input:  candidates/<skill-name>/v*.md
Output: 呼叫 Group 2 評估 API，傳入候選路徑清單
```

### 驗收標準
- [ ] 給定一份實作計畫，能自動輸出需要補充的 skill 清單
- [ ] 對每個缺口能產生 ≥ 3 個格式正確的候選 SKILL.md
- [ ] 候選間有明顯差異（不是同一份改字而已）

---

## Group 2：Skill Evaluation System

### 負責範圍
對多個候選 SKILL.md 進行自動化評估，輸出分數並選出最佳版本，寫入 skill 庫。

### 新增檔案
| 檔案 | 說明 |
|------|------|
| `skills/skill-evaluation/SKILL.md` | 評估流程的 skill |
| `scripts/evaluate-skill.py` | 評估主程式 |
| `scripts/run-pressure-test.sh` | 壓力測試執行器 |
| `scripts/judge-prompt.md` | LLM-as-judge 的 prompt 模板 |

### 詳細任務

**1. 壓力測試執行器**
- 對每個候選 skill，設計 2 種測試場景：
  - 有 skill：agent 應該遵守規則
  - 沒有 skill：agent 應該違規（baseline）或是效果沒有那麼好

  
  return json format:
  ```json
  {
    "skill_name": "using-git-worktrees",
    "candidate": "v1.md",
    "scenario": "with-skill"\"without-skill",
    "prompt": "開始實作這個新功能",
    "agent_actions": [
      {
        "type": "text",
        "content": "我會先建立一個 worktree 來隔離開發"
      },
      {
        "type": "command",
        "content": "git worktree add ../feature-branch feature-branch",
        "exit_code": 0,
        "output": "Preparing worktree (new branch 'feature-branch')"
      },
      {
        "type": "text",
        "content": "worktree 建好了，開始開發"
      }
    ]
  }
  ```
- 用 subagent 跑每個場景，記錄 agent 的實際行為

**2. LLM-as-judge 評分**
- 把 agent 的回應和skill.md送給另一個 LLM 評分 (丟給gemini)
- 評分維度：
  - Required behavior completed: agent 是否完成 skill 明確要求的步驟。

  - Forbidden behavior avoided: agent 是否避免 skill 禁止的行為(若skill沒有禁止的行為則預設得分)。

  - Correct order / workflow: agent 是否按照 skill 指定的流程順序執行。

  - Evidence from response or tool logs: 是否能從 agent response 或 tool calls 看出它真的有遵守，而不是口頭說說。

  - Normal case coverage: 是否清楚處理一般情境。

  - Failure handling: 是否說明失敗、衝突、工具不可用、需要 rollback 時怎麼處理。

  - Clarity and Actoinability: 規則是否清楚易懂且agent看完後是否知道具體要做什麼

  - No contradiction: skill 內部規則是否沒有互相矛盾。


  （1~4項是針對response json評分，5~8項是針對skill.md評分）

- 輸出：每個候選的分數 JSON

**3. 選出 winner 並部署**
- 比較所有候選分數，選最高分
- 將 winner 複製到 `~/.claude/skills/<skill-name>/SKILL.md`
- 記錄評估結果到 `evaluation-log.json`（供 Group 3 Web UI 顯示）

**4. conflict check**
- 傳給 AI 做新增的skill和現有的skill的confliction check, input: 所有新、舊skill的skill.md裡面的name和description
- 輸出有哪些新 skill 和舊的skill conflict則不要採用 （刪掉skill）

**5. 評估 API（供 Group 1 串接）**
```
Input:  候選 SKILL.md 路徑清單, skill 名稱
Output: { winner: "v2.md", scores: { v1: 72, v2: 88, v3: 65 } }
```

### 驗收標準
- [ ] 能對單一候選跑完三種壓力測試場景
- [ ] 能輸出每個候選的數字分數
- [ ] 能自動選出最高分並寫入 skill 庫
- [ ] 評估結果寫成 JSON 供 Web UI 讀取

---

## Group 3：Web UI + Demo

### 負責範圍
建立視覺化介面讓使用者看到 Superpowers pipeline 的執行狀態，並準備 demo 影片與現場展示。

### 新增檔案
| 檔案 | 說明 |
|------|------|
| `webapp/` | Web UI 主目錄 |
| `webapp/index.html` | 主頁面 |
| `webapp/server.js` | 本地 server（讀 event log） |
| `hooks/hooks.json` | 加入 event logging hook |
| `hooks/log-event.sh` | 每個 skill 觸發時寫 log |
| `events.jsonl` | event log 檔（append-only） |

### 詳細任務

**1. Event Logging（事件記錄）**
- 在 `hooks/hooks.json` 加入 hook，在每個 skill 觸發時執行 `log-event.sh`
- Log 格式：
  ```json
  { "timestamp": "...", "skill": "brainstorming", "status": "started", "data": {} }
  { "timestamp": "...", "skill": "brainstorming", "status": "completed", "data": {} }
  ```
- Group 1、2 的特殊事件也要寫進 log：
  - `gap-detected`：偵測到缺口
  - `candidates-generated`：幾個候選生成完成
  - `evaluation-result`：分數結果
  - `skill-deployed`：新 skill 上線

**2. Web UI**
- 本地 server 用 polling 或 file watch 讀 `events.jsonl`
- 顯示內容：
  - Pipeline 進度條：目前在哪個階段（brainstorming / writing-plans / gap-detection / evaluation / executing）
  - Skill 觸發歷史列表
  - Gap Detection 結果：偵測到哪些缺口
  - Evaluation Dashboard：每個候選的分數長條圖、winner 標示
  - 目前 skill 庫列表（即時更新）
- 技術選擇：純 HTML/CSS/JS 即可，不需要框架

**3. Demo 影片**
- 錄製完整 demo 流程（建議 3–5 分鐘）：
  1. 啟動 Claude Code，輸入一個開發任務
  2. 展示 brainstorming → writing-plans 自動觸發
  3. 展示 gap detection 發現缺口
  4. 展示 3 個候選 skill 生成
  5. 展示評估分數出現在 Web UI
  6. 展示 winner 部署，skill 庫更新
  7. 展示新 skill 在後續任務中被自動觸發

**4. 現場 Demo 準備**
- 準備一個固定的 demo 任務（建議選一個會觸發缺口的情境）
- 準備 fallback：如果 live demo 出錯，有預錄影片備用
- 準備簡報說明系統架構（可用本文件的系統概覽圖）

### 驗收標準
- [ ] Web UI 能即時顯示 pipeline 當前步驟
- [ ] Evaluation Dashboard 能顯示候選分數比較
- [ ] Demo 影片錄製完成（3–5 分鐘）
- [ ] 現場 demo 能跑通完整流程

---

## 整合時間表（建議）

| 時間 | 里程碑 |
|------|--------|
| 第 1 週 | 各組定義介面、開始獨立開發；Group 3 先用 mock data 做 UI |
| 第 2 週 | Group 1 完成候選生成；Group 2 完成評估單一 skill |
| 第 3 週 | Group 1 + 2 串接；Group 3 接上真實 event log |
| 第 4 週 | 三組整合；錄製 demo 影片；準備現場展示 |

## 介面契約（各組共同遵守）

```
Group 1 → Group 2：
  檔案：candidates/<skill-name>/v*.md
  呼叫：evaluate-skill.py --skill <name> --candidates <dir>

Group 2 → Group 3：
  檔案：evaluation-log.json
  格式：{ skill, candidates: [{ file, scores, total }], winner }

Group 1、2 → Group 3：
  檔案：events.jsonl（append-only）
  每個事件都要 append 一行 JSON
```
