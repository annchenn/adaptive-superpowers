from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

'''
從這裡拿到 run_pressure_tests()，Group 1 在生成候選後直接呼叫：
records, out_path = run_pressure_tests(
    skill_name="using-git-worktrees",
    candidates_dir="candidates/examples/",
)

Group 2 evaluator 帶自訂 prompt 呼叫：
records, out_path = run_pressure_tests(
    skill_name="using-git-worktrees",
    candidates_dir="candidates/using-git-worktrees/",   
    test_prompt="Create a new feature branch using git worktrees",
    out_base_dir="evaluation/pressure-tests",
)
'''

DEFAULT_TEST_PROMPT = "Please test this skill"
VALID_SCENARIOS = {"with-skill", "without-skill"}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def discover_candidate_files(candidates_dir: Path) -> list[Path]:
    """
    掃描 candidates_dir 裡的候選 SKILL.md 檔案。
    優先抓 v*.md，找不到才 fallback 到所有 *.md。
    目錄或檔案不存在時拋出 FileNotFoundError。
    """
    if not candidates_dir.exists():
        raise FileNotFoundError(f"Candidate directory does not exist: {candidates_dir}")

    files = sorted(candidates_dir.glob("v*.md"))

    if not files:
        files = sorted(candidates_dir.glob("*.md"))

    if not files:
        raise FileNotFoundError(f"No candidate markdown files found in {candidates_dir}")

    return files


def build_subagent_prompt(
    *,
    skill_name: str,
    candidate_file: str,
    candidate_content: str,
    scenario: str,
    test_prompt: str,
) -> str:
    """
    根據 scenario 組出完整的 subagent prompt 字串。

    scenario "with-skill"：
        把候選 SKILL.md 內容提供給 subagent，讓它模擬遵守 skill 的行為。

    scenario "without-skill"：
        不提供 skill 內容，subagent 當成一般 coding agent 回應（baseline）。
    """
    if scenario not in VALID_SCENARIOS:
        raise ValueError(f"Invalid scenario: {scenario!r}. Must be one of {VALID_SCENARIOS}")

    if scenario == "with-skill":
        scenario_instruction = f"""
You are in the WITH-SKILL test scenario.

The candidate SKILL.md below is provided to you.
Your job is to simulate how a coding agent would behave when guided by this skill.

<SKILL name="{skill_name}" candidate="{candidate_file}">
{candidate_content}
</SKILL>

Instructions:
1. Read the skill carefully.
2. Simulate how a coding agent would execute according to the skill's requirements.
3. Record only observable agent actions (no internal thoughts).
4. If you run any shell commands, record the command, exit_code, and output.
5. Do not fabricate command results. If no command is actually run, only record text actions.
""".strip()
    else:
        scenario_instruction = f"""
You are in the WITHOUT-SKILL baseline scenario.

Important:
1. The candidate SKILL.md content is NOT provided in this scenario.
2. Respond as a plain coding agent without any special skill guidance.
3. Do NOT pretend you have seen or followed the "{skill_name}" skill.
4. The purpose of this baseline is to observe whether agent behavior is less complete,
   more error-prone, or lower quality without the skill.
5. Record only observable agent actions.
""".strip()

    return f"""
You are a subagent running a skill pressure test.

skill_name: {skill_name}
candidate: {candidate_file}
scenario: {scenario}

{scenario_instruction}

The user's test prompt is:

<USER_PROMPT>
{test_prompt}
</USER_PROMPT>

Output ONLY a single JSON object.
Do NOT output markdown.
Do NOT output any explanation text.
Do NOT use code fences.

The JSON must conform to this schema:

{{
  "skill_name": "{skill_name}",
  "candidate": "{candidate_file}",
  "scenario": "{scenario}",
  "prompt": {json.dumps(test_prompt, ensure_ascii=False)},
  "agent_actions": [
    {{
      "type": "text",
      "content": "text description of what the agent said or did"
    }},
    {{
      "type": "command",
      "content": "the shell command the agent ran",
      "exit_code": 0,
      "output": "summary of important command output"
    }}
  ]
}}

Rules for agent_actions:
- type must be either "text" or "command".
- text actions require a content field.
- command actions require content, exit_code, and output fields.
- If a command fails, exit_code must be non-zero.
- If no commands were run, only output text actions.
- Do not record internal reasoning, only observable behavior.
""".strip()


def extract_json_object(text: str) -> dict[str, Any] | None:
    """
    嘗試從 subagent 的 stdout 解析出 JSON object。
    依序試：直接 parse → fenced code block → 位置掃描。
    找不到合法 JSON object 時回傳 None。
    """
    text = text.strip()

    if not text:
        return None

    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        pass

    fenced_blocks = re.findall(
        r"```(?:json)?\s*(\{.*?\})\s*```",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )

    for block in fenced_blocks:
        try:
            obj = json.loads(block)
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            continue

    decoder = json.JSONDecoder()

    for match in re.finditer(r"\{", text):
        try:
            obj, _ = decoder.raw_decode(text[match.start():])
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            continue

    return None


def normalize_action(action: Any) -> dict[str, Any] | None:
    """
    正規化單一 agent action dict。
    未知的 type 一律轉成 "text"。
    input 不是 dict 時回傳 None。
    """
    if not isinstance(action, dict):
        return None

    action_type = action.get("type", "text")

    if action_type not in {"text", "command"}:
        action_type = "text"

    content = action.get("content", "")

    if not isinstance(content, str):
        content = json.dumps(content, ensure_ascii=False)

    normalized: dict[str, Any] = {
        "type": action_type,
        "content": content,
    }

    if action_type == "command":
        exit_code = action.get("exit_code")
        output = action.get("output", "")

        normalized["exit_code"] = exit_code if isinstance(exit_code, int) else None
        normalized["output"] = (
            output if isinstance(output, str) else json.dumps(output, ensure_ascii=False)
        )

    return normalized


def build_result_record(
    *,
    skill_name: str,
    candidate_file: str,
    scenario: str,
    test_prompt: str,
    stdout: str,
    stderr: str,
    return_code: int,
) -> dict[str, Any]:
    """
    從 subagent 輸出組出一筆 result record。
    輸出是合法 JSON 且有 agent_actions 就直接用；
    否則 fallback 成一個包含原始 stdout/stderr 的 text action。
    """
    parsed = extract_json_object(stdout)

    if isinstance(parsed, dict) and isinstance(parsed.get("agent_actions"), list):
        actions: list[dict[str, Any]] = []

        for action in parsed["agent_actions"]:
            normalized = normalize_action(action)
            if normalized is not None:
                actions.append(normalized)

        if actions:
            return {
                "skill_name": skill_name,
                "candidate": candidate_file,
                "scenario": scenario,
                "prompt": test_prompt,
                "agent_actions": actions,
            }

    # Fallback：subagent 沒有回傳合法 JSON
    fallback_content = stdout.strip()

    if stderr.strip():
        fallback_content += f"\n\n[stderr]\n{stderr.strip()}"

    if return_code != 0:
        fallback_content += f"\n\n[runner] subagent exited with code {return_code}"

    if not fallback_content.strip():
        fallback_content = "[runner] subagent produced no output"

    return {
        "skill_name": skill_name,
        "candidate": candidate_file,
        "scenario": scenario,
        "prompt": test_prompt,
        "agent_actions": [
            {
                "type": "text",
                "content": fallback_content.strip(),
            }
        ],
    }


def run_subagent(
    *,
    agent_cmd: str,
    prompt: str,
    cwd: Path,
    timeout: int,
) -> tuple[str, str, int]:
    """
    用 stdin 把 prompt 傳給 subagent command 並執行。
    回傳 (stdout, stderr, return_code)。
    逾時時回傳 exit code 124。
    """
    try:
        completed = subprocess.run(
            agent_cmd,
            input=prompt,
            text=True,
            shell=True,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
        )

        return completed.stdout, completed.stderr, completed.returncode

    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        stderr = exc.stderr if isinstance(exc.stderr, str) else ""
        stderr += f"\n[runner] timeout after {timeout} seconds"

        return stdout, stderr, 124


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    """
    把 records 寫成 JSONL 檔（每行一個 JSON object）。
    檔案已存在時直接覆蓋。
    """
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def run_pressure_tests(
    *,
    skill_name: str,
    candidates_dir: str | Path,
    agent_cmd: str = "claude -p",
    out_base_dir: str | Path = "pressure-test-results",
    test_prompt: str = DEFAULT_TEST_PROMPT,
    cwd: str | Path = ".",
    timeout: int = 600,
) -> tuple[list[dict[str, Any]], Path]:
    """
    對所有候選 SKILL.md 跑 with-skill 和 without-skill 兩種壓力測試場景。

    Parameters
    ----------
    skill_name : str
        要測試的 skill 名稱，例如 "using-git-worktrees"。

    candidates_dir : str | Path
        存放候選 SKILL.md 的目錄（v1.md, v2.md, ...）。
        預期結構：
            candidates/
                <skill-name>/
                    v1.md
                    v2.md
                    v3.md

    agent_cmd : str
        呼叫 subagent 的 shell command。
        Prompt 透過 stdin 傳入。
        預設："claude -p"

    out_base_dir : str | Path
        輸出檔案的根目錄。
        結果寫到：<out_base_dir>/<skill_name>/results.jsonl
        預設："pressure-test-results"

    test_prompt : str
        傳給 subagent 的使用者測試 prompt。
        預設："Please test this skill"

    cwd : str | Path
        subagent command 的工作目錄。
        預設：當前目錄

    timeout : int
        每次 subagent 執行的 timeout（秒）。
        預設：600

    Returns
    -------
    records : list[dict]
        所有 result records。每筆格式如下：
            {
                "skill_name": str,
                "candidate": str,       # 例如 "v1.md"
                "scenario": str,        # "with-skill" 或 "without-skill"
                "prompt": str,
                "agent_actions": [
                    {"type": "text", "content": str},
                    {"type": "command", "content": str, "exit_code": int, "output": str},
                    ...
                ]
            }
        record 總數 = 候選檔案數 * 2（每個 scenario 各一筆）。

    out_path : Path
        寫出的 JSONL 檔路徑。
        把這個路徑傳給下游 evaluator（evaluate-skill.py）。

    Example
    -------
    # Group 1 在生成候選後直接呼叫：
    records, out_path = run_pressure_tests(
        skill_name="using-git-worktrees",
        candidates_dir="candidates/using-git-worktrees/",
    )

    # Group 2 evaluator 帶自訂 prompt 呼叫：
    records, out_path = run_pressure_tests(
        skill_name="using-git-worktrees",
        candidates_dir="candidates/using-git-worktrees/",
        test_prompt="Create a new feature branch using git worktrees",
        out_base_dir="evaluation/pressure-tests",
    )

    Notes
    -----
    - 這個 function 只負責跑場景、記錄行為。
    - 不評分、不選 winner、不部署 skill。
    - 同一個 skill_name 重跑會覆蓋舊的 results.jsonl。
      Group 1 確保不會有重複 skill name，所以覆蓋是安全的。
    """
    candidates_dir = Path(candidates_dir)
    out_base_dir = Path(out_base_dir)
    cwd = Path(cwd)

    out_dir = out_base_dir / skill_name
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "results.jsonl"

    candidate_files = discover_candidate_files(candidates_dir)
    records: list[dict[str, Any]] = []

    for candidate_path in candidate_files:
        candidate_content = read_text(candidate_path)
        candidate_file = candidate_path.name

        for scenario in ["with-skill", "without-skill"]:
            subagent_prompt = build_subagent_prompt(
                skill_name=skill_name,
                candidate_file=candidate_file,
                candidate_content=candidate_content,
                scenario=scenario,
                test_prompt=test_prompt,
            )

            stdout, stderr, return_code = run_subagent(
                agent_cmd=agent_cmd,
                prompt=subagent_prompt,
                cwd=cwd,
                timeout=timeout,
            )

            record = build_result_record(
                skill_name=skill_name,
                candidate_file=candidate_file,
                scenario=scenario,
                test_prompt=test_prompt,
                stdout=stdout,
                stderr=stderr,
                return_code=return_code,
            )

            records.append(record)

    write_jsonl(out_path, records)

    return records, out_path