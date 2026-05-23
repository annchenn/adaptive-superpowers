#!/usr/bin/env python3
"""
Skill Evaluation Script — LLM-as-Judge via Vertex AI Gemini

Reads the JSONL produced by pressure_test_runner.py, groups records by candidate,
then calls Gemini once per candidate with both scenarios bundled together.

Usage (CLI):
    python3 evaluate-skill.py --skill <name> --candidates <dir> [--results <jsonl>]

    --skill       Skill name, e.g. "using-git-worktrees"
    --candidates  Directory containing v1.md, v2.md, ... (skill definitions)
    --results     Path to results.jsonl from pressure_test_runner.
                  Defaults to: results/<skill-name>/results.jsonl

Usage (library):
    from evaluate_skill import run_evaluation

    records, _ = run_pressure_tests(skill_name=..., candidates_dir=...)
    result = run_evaluation(skill_name=..., candidates_dir=..., records=records)

Output:
    evaluation-log.json   — full results appended at project root
    events.jsonl          — event stream for Web UI (project root)
    stdout                — winner and scores summary
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import urllib.request
from google import genai
from google.genai import types


LOCATION = "us-central1"
MODEL = "gemini-2.5-flash"
WEBAPP_API = "http://localhost:3001"

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent


def load_project_id() -> str:
    env_path = PROJECT_ROOT / ".env"
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("project_id="):
            return line.split("=", 1)[1].strip()
    raise ValueError(f"project_id not found in {env_path}")
JUDGE_PROMPT_PATH = SCRIPT_DIR / "judge-prompt.md"
EVAL_LOG_PATH = PROJECT_ROOT / "evaluation-log.json"
EVENTS_LOG_PATH = PROJECT_ROOT / "events.jsonl"


# ---------------------------------------------------------------------------
# Input loading
# ---------------------------------------------------------------------------

def load_jsonl(path: Path) -> list[dict]:
    records = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def group_by_candidate(records: list[dict]) -> dict[str, dict[str, dict]]:
    """Returns { "v1.md": {"with-skill": record, "without-skill": record}, ... }"""
    grouped: dict[str, dict] = defaultdict(dict)
    for record in records:
        candidate = record["candidate"]   # e.g. "v1.md"
        scenario = record["scenario"]     # "with-skill" or "without-skill"
        grouped[candidate][scenario] = record
    return dict(grouped)


# ---------------------------------------------------------------------------
# Gemini call
# ---------------------------------------------------------------------------

def load_judge_prompt() -> str:
    return JUDGE_PROMPT_PATH.read_text(encoding="utf-8")


def build_user_message(
    skill_name: str,
    candidate: str,
    skill_md: str,
    with_skill_record: dict,
    without_skill_record: dict,
) -> str:
    return f"""## Skill Definition (skill.md)

Skill name: {skill_name}
Candidate: {candidate}

{skill_md}

---

## Test Log 1: with-skill scenario

The agent had access to the skill above. Below is its recorded behavior.

Prompt given to agent: {with_skill_record.get("prompt", "")}

Agent actions:
{json.dumps(with_skill_record.get("agent_actions", []), indent=2, ensure_ascii=False)}

---

## Test Log 2: without-skill scenario (baseline)

The agent did NOT have access to the skill. Below is its recorded behavior for comparison.

Prompt given to agent: {without_skill_record.get("prompt", "")}

Agent actions:
{json.dumps(without_skill_record.get("agent_actions", []), indent=2, ensure_ascii=False)}
"""


def call_gemini(judge_prompt: str, user_message: str, client: genai.Client) -> dict:
    response = client.models.generate_content(
        model=MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(system_instruction=judge_prompt),
    )
    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def compute_total(scores: dict) -> int:
    """Sum of all dimension scores. Max = 80 (8 dimensions × 10)."""
    return sum(v for v in scores.values() if v is not None)


# ---------------------------------------------------------------------------
# Conflict check
# ---------------------------------------------------------------------------

SKILLS_DIR = PROJECT_ROOT / "skills"
DEPLOY_DIR = PROJECT_ROOT / "skills"


def _parse_frontmatter(text: str) -> dict:
    """Extract name and description from SKILL.md YAML frontmatter."""
    if not text.startswith("---"):
        return {}
    end = text.find("---", 3)
    if end == -1:
        return {}
    block = text[3:end]
    result = {}
    for line in block.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            result[k.strip()] = v.strip().strip('"')
    return result


def _load_existing_skills() -> list[dict]:
    """Return [{name, description, path}] for all skills in SKILLS_DIR."""
    skills = []
    for skill_file in SKILLS_DIR.glob("*/SKILL.md"):
        meta = _parse_frontmatter(skill_file.read_text(encoding="utf-8"))
        if meta.get("name"):
            skills.append({
                "name": meta["name"],
                "description": meta.get("description", ""),
                "path": str(skill_file),
            })
    return skills


def check_conflict(skill_name: str, winner_md: str, client: genai.Client) -> tuple[bool, str]:
    """
    Ask Gemini whether the new skill conflicts with any existing skill.
    Returns (has_conflict, reason).
    """
    new_meta = _parse_frontmatter(winner_md)
    existing = _load_existing_skills()

    if not existing:
        return False, "no existing skills to conflict with"

    existing_summary = "\n".join(
        f"- name: {s['name']}\n  description: {s['description']}"
        for s in existing
    )

    prompt = f"""You are checking whether a new skill conflicts with existing skills in a skill library.

A conflict means: the new skill covers essentially the same situation as an existing skill,
or their instructions would contradict each other if both were active.

New skill:
  name: {new_meta.get('name', skill_name)}
  description: {new_meta.get('description', '(no description)')}

Existing skills:
{existing_summary}

Does the new skill conflict with any existing skill?
Answer with ONLY this JSON, no explanation:
{{"conflict": true/false, "conflicting_skill": "<name or null>", "reason": "<one sentence>"}}"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="You are a skill library conflict checker. Return only JSON."
        ),
    )
    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    result = json.loads(raw)
    return result.get("conflict", False), result.get("reason", "")


# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------

def deploy_winner(skill_name: str, winner_file: Path) -> Path:
    """Copy winner SKILL.md to ~/.claude/skills/<skill-name>/SKILL.md."""
    target_dir = DEPLOY_DIR / skill_name
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / "SKILL.md"
    target.write_text(winner_file.read_text(encoding="utf-8"), encoding="utf-8")
    return target


# ---------------------------------------------------------------------------
# Event log
# ---------------------------------------------------------------------------

def _post_eval_log(log_entry: dict) -> None:
    """POST to webapp API so it broadcasts via socket.io. Falls back to file write if server is down."""
    try:
        body = json.dumps(log_entry, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            f"{WEBAPP_API}/api/evaluation-log",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3):
            print("  [eval-log] posted to webapp API")
    except Exception:
        # Server not running — write file directly as fallback (same format server would write)
        EVAL_LOG_PATH.write_text(json.dumps(log_entry, indent=2, ensure_ascii=False), encoding="utf-8")
        print("  [eval-log] webapp not reachable, wrote to file directly")


def append_event(event: dict) -> None:
    with EVENTS_LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Core evaluation
# ---------------------------------------------------------------------------

def evaluate_candidate(
    skill_name: str,
    candidate: str,
    skill_md: str,
    with_skill_record: dict,
    without_skill_record: dict,
    judge_prompt: str,
    client: genai.Client,
) -> dict:
    print(f"  judging {candidate} ...", end=" ", flush=True)

    user_msg = build_user_message(
        skill_name, candidate, skill_md, with_skill_record, without_skill_record
    )
    score_json = call_gemini(judge_prompt, user_msg, client)
    score_json["total"] = compute_total(score_json["scores"])

    print(f"total={score_json['total']}")

    return {
        "file": candidate,
        "scores": score_json["scores"],
        "total": score_json["total"],
        "reasoning": score_json.get("reasoning", {}),
    }


def run_evaluation(
    skill_name: str,
    candidates_dir: Path | None = None,
    records: list[dict] | None = None,
    results_jsonl: Path | None = None,
) -> dict:
    """
    Main evaluation entry point.

    candidates_dir defaults to: candidates/<skill_name>/
    results_jsonl  defaults to: results/<skill_name>/results.jsonl
    records can be passed directly from pressure_test_runner.run_pressure_tests()
    """
    project_id = load_project_id()
    client = genai.Client(vertexai=True, project=project_id, location=LOCATION)
    judge_prompt = load_judge_prompt()

    # load records from JSONL if not passed directly
    if records is None:
        if results_jsonl is None:
            results_jsonl = PROJECT_ROOT / "results" / skill_name / "results.jsonl"
        if not results_jsonl.exists():
            print(f"Results file not found: {results_jsonl}", file=sys.stderr)
            sys.exit(1)
        records = load_jsonl(results_jsonl)

    grouped = group_by_candidate(records)
    candidates = sorted(grouped.keys())  # ["v1.md", "v2.md", ...]

    print(f"Evaluating skill: {skill_name}")
    print(f"Candidates: {candidates}")

    append_event({
        "timestamp": now_iso(),
        "skill": skill_name,
        "status": "started",
        "data": {"candidates": candidates},
    })

    # judge each candidate with one Gemini call (both scenarios bundled)
    evaluations = []
    for candidate in candidates:
        scenario_map = grouped[candidate]
        with_skill = scenario_map.get("with-skill", {})
        without_skill = scenario_map.get("without-skill", {})

        if not with_skill:
            print(f"  [warn] no with-skill record for {candidate}, skipping")
            continue
        if not without_skill:
            print(f"  [warn] no without-skill record for {candidate}, skipping")
            continue

        stem = Path(candidate).stem  # "v1"
        skill_file = candidates_dir / f"{stem}.md"
        if not skill_file.exists():
            print(f"  [warn] skill file not found: {skill_file}, skipping")
            continue

        skill_md = skill_file.read_text(encoding="utf-8")
        result = evaluate_candidate(
            skill_name, candidate, skill_md,
            with_skill, without_skill,
            judge_prompt, client,
        )
        evaluations.append(result)

    if not evaluations:
        print("No candidates could be evaluated.", file=sys.stderr)
        sys.exit(1)

    # pick winner by highest total
    winner_entry = max(evaluations, key=lambda e: e["total"])
    winner = winner_entry["file"]
    scores_summary = {e["file"]: e["total"] for e in evaluations}

    print(f"\nScores: {scores_summary}")
    print(f"Winner: {winner} ({winner_entry['total']})")

    log_entry = {
        "timestamp": now_iso(),
        "skill": skill_name,
        "candidates": evaluations,
        "winner": winner,
        "scores": scores_summary,
    }

    # POST to webapp API (writes file + broadcasts via socket.io to browser)
    # Falls back to writing the file directly if the server is not running.
    _post_eval_log(log_entry)

    append_event({
        "timestamp": now_iso(),
        "skill": skill_name,
        "status": "evaluation-result",
        "data": {"winner": winner, "scores": scores_summary},
    })

    # conflict check before deploying
    winner_stem = Path(winner).stem
    winner_file = candidates_dir / f"{winner_stem}.md"
    winner_md = winner_file.read_text(encoding="utf-8")

    print(f"\nChecking conflicts for {winner} ...")
    has_conflict, reason = check_conflict(skill_name, winner_md, client)

    if has_conflict:
        print(f"  [conflict] {reason} — skipping deploy")
        append_event({
            "timestamp": now_iso(),
            "skill": skill_name,
            "status": "conflict-detected",
            "data": {"winner": winner, "reason": reason},
        })
        log_entry["deployed"] = False
        log_entry["conflict_reason"] = reason
    else:
        print(f"  [no conflict] {reason}")
        deployed_path = deploy_winner(skill_name, winner_file)
        print(f"  [deployed] {deployed_path}")
        append_event({
            "timestamp": now_iso(),
            "skill": skill_name,
            "status": "skill-deployed",
            "data": {"winner": winner, "path": str(deployed_path)},
        })
        log_entry["deployed"] = True
        log_entry["deployed_path"] = str(deployed_path)

    return log_entry


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate skill candidates via LLM-as-judge")
    parser.add_argument("--skill", required=True, help="Skill name")
    parser.add_argument(
        "--candidates",
        default=None,
        help="Dir with v1.md, v2.md, ... (default: candidates/<skill>/)",
    )
    parser.add_argument(
        "--results",
        default=None,
        help="Path to results.jsonl (default: results/<skill>/results.jsonl)",
    )
    args = parser.parse_args()

    candidates_dir = Path(args.candidates) if args.candidates else PROJECT_ROOT / "candidates" / args.skill
    results_jsonl = Path(args.results) if args.results else PROJECT_ROOT / "results" / args.skill / "results.jsonl"

    result = run_evaluation(
        skill_name=args.skill,
        candidates_dir=candidates_dir,
        results_jsonl=results_jsonl,
    )
    print(json.dumps({"winner": result["winner"], "scores": result["scores"]}, indent=2))


if __name__ == "__main__":
    main()
