# Scripts 說明

本目錄包含 Adaptive Superpowers 專案新增的自動化腳本。

---

## generate-candidates.py

### 功能說明

這支腳本是 **Group 1（Skill Gap Detection）** 的核心執行工具。

當系統在計畫階段偵測到 skill 缺口（gap）後，會呼叫這支腳本，針對每個缺口自動生成多個不同角度的候選 `SKILL.md` 檔案，提供給 Group 2 的評估系統打分數並選出最佳版本。

### 運作流程

```
偵測到 skill 缺口
    ↓
generate-candidates.py（本腳本）
    ↓
呼叫 LLM（Claude 或 GPT）
    ↓
從 5 種不同撰寫角度各生成一份候選 SKILL.md
    ↓
輸出到 candidates/<skill-name>/v1.md, v2.md, v3.md ...
    ↓
寫入事件到 events.jsonl（供 Group 3 Web UI 顯示）
    ↓
提示下一步：執行 evaluate-skill.py（Group 2）
```

### 五種撰寫角度

每個候選檔案使用不同的角度撰寫，確保候選之間有明顯差異：

| 角度 | 說明 |
|------|------|
| `process-first` | 以步驟流程為主，條列每個動作 |
| `prohibition-first` | 先列出不能做的事和常見錯誤 |
| `example-first` | 先給一個具體的程式碼範例，再說明原則 |
| `principle-first` | 先解釋背後的原理，從原理推導出規則 |
| `checklist-first` | 整份文件以勾選清單格式撰寫，簡潔易掃讀 |

### 使用方式

**前置需求：**
```bash
pip install anthropic   # 使用 Claude（預設）
# 或
pip install openai      # 使用 GPT

export ANTHROPIC_API_KEY=你的金鑰
# 或
export OPENAI_API_KEY=你的金鑰
```

**基本指令：**
```bash
python3 scripts/generate-candidates.py \
  --skill-name <skill名稱（用連字號分隔）> \
  --context "<這個 skill 為什麼需要存在>" \
  --expected-behavior "<有這個 skill 時 agent 會怎麼做>" \
  --candidates 3
```

**實際範例：**
```bash
python3 scripts/generate-candidates.py \
  --skill-name redis-caching-patterns \
  --context "Agent 需要設定 Redis TTL 策略與 cache-aside 模式，目前沒有對應的 skill。" \
  --expected-behavior "Agent 能正確選擇 TTL 數值、實作 cache-aside，避免 thundering herd 問題。" \
  --candidates 3
```

**使用 OpenAI：**
```bash
python3 scripts/generate-candidates.py \
  --skill-name my-skill \
  --context "..." \
  --expected-behavior "..." \
  --provider openai \
  --candidates 3
```

**預覽模式（不呼叫 API）：**
```bash
python3 scripts/generate-candidates.py \
  --skill-name my-skill \
  --context "..." \
  --expected-behavior "..." \
  --dry-run
```

### 參數說明

| 參數 | 必填 | 說明 |
|------|------|------|
| `--skill-name` | 是 | Skill 名稱，只能用英文字母、數字、連字號 |
| `--context` | 是 | 說明這個 skill 缺口的情境（來自 gap report） |
| `--expected-behavior` | 是 | 有此 skill 時 agent 應有的行為表現 |
| `--candidates` | 否 | 要生成幾個候選，預設 3，最多 5 |
| `--output-dir` | 否 | 輸出目錄，預設 `candidates/` |
| `--provider` | 否 | LLM 供應商，`anthropic`（預設）或 `openai` |
| `--model` | 否 | 指定模型名稱，不填則使用各 provider 預設值 |
| `--dry-run` | 否 | 只印出 prompt，不實際呼叫 API |

### 輸出結果

```
candidates/
  <skill-name>/
    v1.md    ← process-first 角度
    v2.md    ← prohibition-first 角度
    v3.md    ← example-first 角度
```

每個檔案開頭有一行元數據注解：
```
<!-- Candidate: v1 | Angle: process-first | Generated: 2026-05-24T00:00:00+00:00 -->
```

這行在部署時會被移除，主要供評估系統和人工審閱使用。

### 與其他組的串接

執行完畢後，腳本會輸出 Group 2 的執行指令：

```bash
python scripts/evaluate-skill.py --skill <skill-name> --candidates candidates/<skill-name>
```

同時自動將以下事件寫入 `events.jsonl`（供 Group 3 Web UI 讀取）：

```json
{ "timestamp": "...", "skill": "skill-gap-detection", "status": "candidates-generating", "data": { "skill_name": "...", "count": 3 } }
{ "timestamp": "...", "skill": "skill-gap-detection", "status": "candidates-generated", "data": { "skill_name": "...", "count": 3, "paths": ["candidates/.../v1.md", ...] } }
```
