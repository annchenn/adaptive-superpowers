# Scripts — 壓力測試與評估

**負責組別：** Group 2  
**最後更新：** 2026-05-23

---

## Pipeline 總覽

```
Group 1 生成候選 skill
        │
        ▼
pressure_test_runner.py   — 對每個候選跑 with-skill / without-skill，記錄 agent 行為
        │  results/<skill>/results.jsonl
        ▼
evaluate-skill.py         — LLM-as-judge（Gemini），選出 winner，部署到 skills/
        │  evaluation-log.json + events.jsonl
        ▼
webapp（Group 3）         — 顯示評分、conflict 狀態、已部署的 skill
```

**Group 1 負責驅動整個流程。** Group 2 提供兩支 Python 腳本。Group 3 負責讀取輸出並顯示在 Web UI。

---

## Group 1 — 如何呼叫完整 Pipeline

### 方法 A：一次跑完（推薦）

```python
from pressure_test_runner import run_pressure_tests
from evaluate_skill import run_evaluation

skill_name = "your-skill-name"
candidates_dir = "candidates/your-skill-name/"   # 放 v1.md, v2.md, v3.md

# Step 1 — 壓力測試（每個候選跑 with-skill 和 without-skill）
records, out_path = run_pressure_tests(
    skill_name=skill_name,
    candidates_dir=candidates_dir,
)

# Step 2 — 評估候選、選 winner、部署
result = run_evaluation(
    skill_name=skill_name,
    candidates_dir=candidates_dir,
    records=records,          # 直接傳 records，不用重新讀檔
)

print(result["winner"])       # e.g. "v3.md"
print(result["scores"])       # e.g. {"v1.md": 62, "v2.md": 70, "v3.md": 79}
print(result["deployed"])     # True 或 False（False = 有 conflict，沒有部署）
```

### 方法 B：CLI（手動測試用）

```bash
# 跑壓力測試
python3 scripts/pressure_test_runner.py --skill your-skill-name --candidates candidates/your-skill-name/

# 跑評估（預設讀 results/<skill>/results.jsonl）
python3 scripts/evaluate-skill.py --skill your-skill-name
```

### 候選檔案結構

```
candidates/
  your-skill-name/
    v1.md
    v2.md
    v3.md
```

每個檔案是一個 SKILL.md 候選，需要有 YAML frontmatter：

```markdown
---
name: your-skill-name
description: 一行描述什麼情境下會觸發這個 skill。
---

# Skill 內容
```

### `run_evaluation` 回傳值

```python
{
    "timestamp": "2026-05-23T10:00:00+00:00",
    "skill": "your-skill-name",
    "candidates": [
        {
            "file": "v1.md",
            "scores": { "required_behavior_completed": 8, ... },
            "total": 62,
            "reasoning": { "required_behavior_completed": "...", ... }
        },
        ...
    ],
    "winner": "v3.md",
    "scores": { "v1.md": 62, "v2.md": 70, "v3.md": 79 },
    "deployed": True,
    "deployed_path": "/path/to/skills/your-skill-name/SKILL.md"
    # 或者（有 conflict 時）：
    "deployed": False,
    "conflict_reason": "conflicts with existing skill X"
}
```

---

## Group 3 — Webapp 需要調整的地方

### 分數欄位名稱

`evaluate-skill.py` 回傳 8 個評分維度，需要更新 `EvaluationDashboard.jsx`，把舊的 `compliance` / `coverage` / `conciseness` 改成以下欄位：

| 欄位 | 評估內容 | 滿分 |
|------|---------|------|
| `required_behavior_completed` | agent 是否完成 skill 要求的所有步驟 | 10 |
| `forbidden_behavior_avoided` | agent 是否避免了 skill 禁止的行為 | 10 |
| `correct_order_workflow` | agent 是否按照 skill 指定的順序執行 | 10 |
| `evidence_from_logs` | log 中有無實際行為證據（不只是口頭聲稱） | 10 |
| `normal_case_coverage` | skill 是否清楚說明一般情境怎麼做 | 10 |
| `failure_handling` | skill 是否說明出錯時怎麼處理 | 10 |
| `clarity_and_actionability` | skill 的規則是否清晰、可立即執行 | 10 |
| `no_contradiction` | skill 的規則是否沒有內部矛盾 | 10 |

**總分上限是 80**（8 × 10），不是 100。任何百分比或座標軸顯示請對應調整。

### Events 類型

`events.jsonl` 每行一個事件。Webapp 目前已處理 `started` 和 `evaluation-result`，還需要處理：

| `status` | 觸發時機 | `data` 欄位 |
|----------|---------|------------|
| `started` | 開始評估 | `candidates: ["v1.md", ...]` |
| `evaluation-result` | 選出 winner | `winner: "v3.md"`, `scores: {...}` |
| `skill-deployed` | skill 寫入 `skills/` | `winner`, `path` |
| `conflict-detected` | winner 因衝突未部署 | `winner`, `reason` |

`conflict-detected` 代表 winner **沒有被部署**，UI 上建議明確標示（例如在得分最高的候選上顯示「衝突、未部署」）。

### evaluation-log.json 格式

Server 會寫這個檔並透過 `socket.on('eval-log', ...)` 廣播。格式與 `run_evaluation` 回傳值相同（見上方），其中每個候選的結構是：

```json
{
  "file": "v1.md",
  "total": 62,
  "scores": {
    "required_behavior_completed": 8,
    "forbidden_behavior_avoided": 9,
    "correct_order_workflow": 7,
    "evidence_from_logs": 8,
    "normal_case_coverage": 8,
    "failure_handling": 7,
    "clarity_and_actionability": 8,
    "no_contradiction": 7
  },
  "reasoning": {
    "required_behavior_completed": "Agent 在所有測試 commit 中都使用了 conventional commit prefix。",
    ...
  }
}
```

---

## pressure_test_runner.py — 參數說明

### `run_pressure_tests` 參數

```python
run_pressure_tests(
    skill_name,     # 必填。e.g. "using-git-worktrees"
    candidates_dir, # 必填。e.g. "candidates/using-git-worktrees/"
    agent_cmd,      # 選填。預設 "claude -p"
    out_base_dir,   # 選填。預設 "results"
    test_prompt,    # 選填。預設 "Please test this skill"
    cwd,            # 選填。subagent 工作目錄，預設當前目錄
    timeout,        # 選填。每次 subagent 的 timeout（秒），預設 600
)
```

回傳 `(records, out_path)`，`records` 是 `list[dict]`，`out_path` 是寫出的 JSONL 路徑。

### 輸出檔案

`results/<skill_name>/results.jsonl` — 每行一筆 JSON。3 個候選 → 6 行（每個候選 × 2 個 scenario）：

```
第 1 行: v1.md + with-skill
第 2 行: v1.md + without-skill
第 3 行: v2.md + with-skill
...
```

### Record schema

```json
{
  "skill_name": "using-git-worktrees",
  "candidate": "v1.md",
  "scenario": "with-skill",
  "prompt": "Please test this skill",
  "agent_actions": [
    {
      "type": "text",
      "content": "我會建立一個 worktree 來隔離這個 feature branch。"
    },
    {
      "type": "command",
      "content": "git worktree add ../feature-login -b feature/login",
      "exit_code": 0,
      "output": "Preparing worktree (new branch 'feature/login')"
    }
  ]
}
```

`agent_actions` type 說明：

| type | 欄位 | 說明 |
|------|------|------|
| `text` | `content` | agent 的文字輸出 |
| `command` | `content`, `exit_code`, `output` | shell command；`exit_code` 永遠是 int，agent 沒給時預設 `-1` |

### 注意事項

- 同一個 `skill_name` 重跑會**覆蓋**舊的 `results.jsonl`。
- Prompt 透過 **stdin** 傳給 subagent，不是 CLI 參數。
- subagent 輸出不是合法 JSON 時，整個 stdout 會存成一個 `text` action（fallback，不會 crash）。
- Timeout 預設 600 秒，跑很慢的 agent 可以調大。
