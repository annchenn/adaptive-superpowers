# Pressure Test Runner

**File:** `pressure_test_runner.py`
**Owner:** Group 2（壓力測試）
**Last updated:** 2025-05-23

---

## 這個模組是什麼

對每個候選 SKILL.md，自動跑兩種場景：

- **with-skill**：把 skill 內容給 subagent，觀察它有沒有遵守規則
- **without-skill**：不給 skill 內容，當作 baseline，觀察沒有引導時行為差多少

結果寫成 JSONL 檔，供 Group 2 後段評分、Group 3 Web UI 顯示。

**這個模組只負責跑場景、記錄行為。不評分、不選 winner、不部署 skill。**

---

## 各組怎麼用

### Group 1（生成候選後呼叫）

產生候選 SKILL.md 之後，直接 import 呼叫：

```python
from pressure_test_runner import run_pressure_tests

records, out_path = run_pressure_tests(
    skill_name="your-skill-name",
    candidates_dir="candidates/your-skill-name/",
)
```

`out_path` 是輸出的 JSONL 檔路徑，傳給 Group 2 評分用。

**候選檔案放在這個結構下：**
```
candidates/
  your-skill-name/
    v1.md
    v2.md
    v3.md
```

---

### Group 2 後段（拿結果去評分）

`skill_name` 和 `candidates_dir` 是由 Group 1 傳進來的，不是 Group 2 自己填的。

```python
# evaluate-skill.py（Group 2 後段）
from pressure_test_runner import run_pressure_tests

def evaluate(skill_name: str, candidates_dir: str):
    # skill_name、candidates_dir 由 Group 1 呼叫時傳入
    records, out_path = run_pressure_tests(
        skill_name=skill_name,
        candidates_dir=candidates_dir,
    )

    # records 是 list[dict]，直接拿去跑 LLM-as-judge
    # out_path 是 JSONL 檔路徑，例如 pressure-test-results/using-git-worktrees/results.jsonl
    for record in records:
        print(record["candidate"], record["scenario"])
```

---

### Group 3（Web UI 顯示）

結果檔路徑固定是：

```
pressure-test-results/<skill-name>/results.jsonl
```

直接讀這個 JSONL 檔，每行一筆 JSON object，格式見下方「Output 格式」。

---

## Function 參數一覽

```python
run_pressure_tests(
    skill_name,           # 必填。skill 名稱，例如 "using-git-worktrees"
    candidates_dir,       # 必填。候選目錄路徑，例如 "candidates/using-git-worktrees/"
    agent_cmd,            # 選填。預設 "claude -p"
    out_base_dir,         # 選填。預設 "pressure-test-results"
    test_prompt,          # 選填。預設 "Please test this skill"
    cwd,                  # 選填。subagent 工作目錄，預設當前目錄
    timeout,              # 選填。每次 subagent 的 timeout（秒），預設 600
)
```

**回傳值：`(records, out_path)`**

| 回傳值 | 型別 | 說明 |
|--------|------|------|
| `records` | `list[dict]` | 所有 result records |
| `out_path` | `Path` | 寫出的 JSONL 檔路徑 |

---

## Output 格式

輸出路徑：`<out_base_dir>/<skill_name>/results.jsonl`

每行一筆 JSON object（JSONL 格式，不是 JSON array）。

假設 3 個候選，輸出 6 行（3 個候選 × 2 個 scenario）：

```
line 1: v1.md + with-skill
line 2: v1.md + without-skill
line 3: v2.md + with-skill
line 4: v2.md + without-skill
line 5: v3.md + with-skill
line 6: v3.md + without-skill
```

**每筆 record 的 schema：**

```json
{
  "skill_name": "using-git-worktrees",
  "candidate": "v1.md",
  "scenario": "with-skill",
  "prompt": "Please test this skill",
  "agent_actions": [
    {
      "type": "text",
      "content": "I'll follow the skill and create a worktree for the feature branch."
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

```json
{
  "skill_name": "using-git-worktrees",
  "candidate": "v1.md",
  "scenario": "without-skill",
  "prompt": "Please test this skill",
  "agent_actions": [
    {
      "type": "text",
      "content": "I'll follow the skill and create a worktree for the feature branch."
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
**實際輸出範例（with-skill scenario）：**

```json
{
  "skill_name": "using-git-worktrees",
  "candidate": "v1.md",
  "scenario": "with-skill",
  "prompt": "Please test this skill",
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
```json
{
  "skill_name": "using-git-worktrees",
  "candidate": "v1.md",
  "scenario": "without-skill",
  "prompt": "Please test this skill",
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
**agent_actions 欄位說明：**

| type | 必填欄位 | 說明 |
|------|----------|------|
| `text` | `content` | agent 說的話或文字描述 |
| `command` | `content`, `exit_code`, `output` | agent 執行的 shell command，`exit_code` 永遠是 int（subagent 沒給時預設 `-1`） |

---

## 注意事項

- 同一個 `skill_name` 重跑會**覆蓋**舊的 `results.jsonl`（Group 1 確保不會有重複 skill name，所以覆蓋是安全的）
- `agent_cmd` 的 prompt 透過 **stdin** 傳入，不是 CLI 參數
- subagent 輸出不是合法 JSON 時，程式不會 crash，而是把 stdout 整個存成一個 text action（fallback）
- timeout 預設 600 秒，跑很慢的 agent 可以調大
- output 在寫入前會經過 schema validation，格式不合法會拋出 `ValueError`
- command action 的 `exit_code` 永遠是 int，subagent 沒給時預設 `-1`
