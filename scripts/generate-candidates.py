#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Requires Python 3.8+
"""
generate-candidates.py

Generate N diverse candidate SKILL.md files for a detected skill gap.
Each candidate uses a different authoring angle so the downstream evaluator
(Group 2) can select the best one.

Usage:
    python scripts/generate-candidates.py \
        --skill-name redis-caching-patterns \
        --context "Agent must configure Redis with TTL policies and cache-aside pattern." \
        --expected-behavior "Agent selects appropriate TTL, implements cache-aside, avoids thundering herd." \
        --candidates 3 \
        --output-dir candidates/

Requirements:
    pip install anthropic          # or: openai  (set --provider openai)
    export ANTHROPIC_API_KEY=...   # or OPENAI_API_KEY

Environment variables:
    ANTHROPIC_API_KEY   - Anthropic Claude API key (default provider)
    OPENAI_API_KEY      - OpenAI API key (when --provider openai)
    CANDIDATE_MODEL     - Override default model (optional)
"""

import argparse
import json
import os
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path

def _load_dotenv() -> None:
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

_load_dotenv()

# ---------------------------------------------------------------------------
# Authoring angles – each candidate gets a different one
# ---------------------------------------------------------------------------

ANGLES = [
    {
        "name": "process-first",
        "description": "Step-by-step workflow, numbered procedure, 'do X then Y then Z'",
        "instruction": (
            "Structure the skill as a clear numbered procedure. "
            "Lead with the step-by-step workflow. "
            "Each step should be a concrete action the agent takes. "
            "Put principles and caveats after the procedure."
        ),
    },
    {
        "name": "prohibition-first",
        "description": "Starts with what NOT to do, anti-patterns, red flags list",
        "instruction": (
            "Open with a prominent list of anti-patterns and common mistakes. "
            "Make the forbidden actions memorable and specific. "
            "Then describe the correct approach as the alternative to each prohibition."
        ),
    },
    {
        "name": "example-first",
        "description": "Opens with a concrete realistic scenario, patterns emerge from it",
        "instruction": (
            "Begin with a realistic, self-contained code or scenario example. "
            "Derive the rules and principles from that example. "
            "The example should be production-quality, not contrived."
        ),
    },
    {
        "name": "principle-first",
        "description": "Explains the 'why' deeply, rules derived from first principles",
        "instruction": (
            "Start by explaining the core insight or mental model. "
            "Derive concrete rules from that understanding. "
            "Favour depth of understanding over breadth of coverage."
        ),
    },
    {
        "name": "checklist-first",
        "description": "Structured as a verification checklist, terse and scannable",
        "instruction": (
            "Format the entire skill as a scannable checklist. "
            "Every rule is a checkbox item. "
            "Be terse: one line per item. "
            "Group items under clear headings."
        ),
    },
]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = textwrap.dedent("""\
    You are an expert technical writer creating SKILL.md files for AI coding agents.

    A SKILL.md file is a concise reference guide that helps an AI agent reliably
    perform a specific technical task. Good skills:
    - Have valid YAML frontmatter (name, description fields)
    - Start description with "Use when..." describing triggering conditions only
    - Include an overview, when-to-use, core pattern/reference, and common mistakes
    - Are under 500 words
    - Use concrete examples, not abstract advice
    - Are written in third person (will be injected into an agent's system prompt)

    Respond with ONLY the raw Markdown content of the SKILL.md file.
    Do not wrap it in a code block. Do not add any explanation outside the file.
""")


def build_user_prompt(
    skill_name: str,
    context: str,
    expected_behavior: str,
    angle: dict,
    candidate_index: int,
    total_candidates: int,
    timestamp: str,
) -> str:
    return textwrap.dedent(f"""\
        Create candidate v{candidate_index} of {total_candidates} for the skill:

        **Skill name:** {skill_name}

        **Gap context (why this skill is needed):**
        {context}

        **Expected agent behavior WITH this skill:**
        {expected_behavior}

        **Authoring angle for this candidate:** {angle['name']}
        {angle['instruction']}

        Begin the file with this metadata comment (it will be stripped before deployment):
        <!-- Candidate: v{candidate_index} | Angle: {angle['name']} | Generated: {timestamp} -->

        Then write the complete SKILL.md content.
    """)


# ---------------------------------------------------------------------------
# LLM providers
# ---------------------------------------------------------------------------

def call_anthropic(prompt: str, system: str, model: str) -> str:
    try:
        import anthropic
    except ImportError:
        sys.exit(
            "anthropic package not installed. Run: pip install anthropic"
        )

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def call_openai(prompt: str, system: str, model: str) -> str:
    try:
        from openai import OpenAI
    except ImportError:
        sys.exit(
            "openai package not installed. Run: pip install openai"
        )

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        max_tokens=2048,
    )
    return response.choices[0].message.content


DEFAULT_MODELS = {
    "anthropic": "claude-3-5-haiku-20241022",
    "openai": "gpt-4o-mini",
}


def generate_candidate(
    skill_name: str,
    context: str,
    expected_behavior: str,
    angle: dict,
    candidate_index: int,
    total_candidates: int,
    provider: str,
    model: str,
    timestamp: str,
) -> str:
    prompt = build_user_prompt(
        skill_name=skill_name,
        context=context,
        expected_behavior=expected_behavior,
        angle=angle,
        candidate_index=candidate_index,
        total_candidates=total_candidates,
        timestamp=timestamp,
    )

    if provider == "anthropic":
        return call_anthropic(prompt, SYSTEM_PROMPT, model)
    elif provider == "openai":
        return call_openai(prompt, SYSTEM_PROMPT, model)
    else:
        sys.exit(f"Unknown provider: {provider}. Use 'anthropic' or 'openai'.")


# ---------------------------------------------------------------------------
# Event logging (for Group 3 Web UI)
# ---------------------------------------------------------------------------

EVENTS_FILE = Path("events.jsonl")


def append_event(event: dict) -> None:
    with EVENTS_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(event) + "\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate N diverse candidate SKILL.md files for a skill gap."
    )
    parser.add_argument(
        "--skill-name",
        required=True,
        help="Kebab-case name for the new skill (e.g. redis-caching-patterns)",
    )
    parser.add_argument(
        "--context",
        required=True,
        help="Why this skill is needed (from the gap report context field)",
    )
    parser.add_argument(
        "--expected-behavior",
        required=True,
        help="What an agent with this skill does differently (from gap report)",
    )
    parser.add_argument(
        "--candidates",
        type=int,
        default=3,
        choices=range(1, len(ANGLES) + 1),
        metavar=f"1-{len(ANGLES)}",
        help=f"Number of candidate files to generate (default: 3, max: {len(ANGLES)})",
    )
    parser.add_argument(
        "--output-dir",
        default="candidates",
        help="Root output directory (default: candidates/)",
    )
    parser.add_argument(
        "--provider",
        default="anthropic",
        choices=["anthropic", "openai"],
        help="LLM provider (default: anthropic)",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Override model name (default: provider-specific default)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print prompts without calling the LLM",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    model = args.model or os.environ.get(
        "CANDIDATE_MODEL", DEFAULT_MODELS[args.provider]
    )

    # Validate API key exists (unless dry run)
    if not args.dry_run:
        key_var = "ANTHROPIC_API_KEY" if args.provider == "anthropic" else "OPENAI_API_KEY"
        if not os.environ.get(key_var):
            sys.exit(
                f"Error: {key_var} environment variable is not set.\n"
                f"Export it before running this script."
            )

    timestamp = datetime.now(timezone.utc).isoformat()
    output_dir = Path(args.output_dir) / args.skill_name
    output_dir.mkdir(parents=True, exist_ok=True)

    selected_angles = ANGLES[: args.candidates]

    print(f"Generating {args.candidates} candidate(s) for skill: {args.skill_name}")
    print(f"Output directory: {output_dir}")
    print(f"Provider: {args.provider} / Model: {model}")
    print()

    # Log generation start
    append_event({
        "timestamp": timestamp,
        "skill": "skill-gap-detection",
        "status": "candidates-generating",
        "data": {
            "skill_name": args.skill_name,
            "count": args.candidates,
        },
    })

    generated_paths: list[str] = []

    for i, angle in enumerate(selected_angles, start=1):
        output_path = output_dir / f"v{i}.md"
        print(f"  [{i}/{args.candidates}] Angle: {angle['name']} → {output_path}")

        if args.dry_run:
            prompt = build_user_prompt(
                skill_name=args.skill_name,
                context=args.context,
                expected_behavior=args.expected_behavior,
                angle=angle,
                candidate_index=i,
                total_candidates=args.candidates,
                timestamp=timestamp,
            )
            print("--- DRY RUN: prompt ---")
            print(prompt)
            print("--- end prompt ---\n")
            continue

        content = generate_candidate(
            skill_name=args.skill_name,
            context=args.context,
            expected_behavior=args.expected_behavior,
            angle=angle,
            candidate_index=i,
            total_candidates=args.candidates,
            provider=args.provider,
            model=model,
            timestamp=timestamp,
        )

        output_path.write_text(content, encoding="utf-8")
        generated_paths.append(str(output_path))
        print(f"     ✓ Written ({len(content.split())} words)")

    if not args.dry_run:
        # Log candidates generated
        append_event({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "skill": "skill-gap-detection",
            "status": "candidates-generated",
            "data": {
                "skill_name": args.skill_name,
                "count": len(generated_paths),
                "paths": generated_paths,
            },
        })

        print()
        print(f"Done. {len(generated_paths)} candidate(s) written to {output_dir}/")
        print()
        print("Next step — run evaluation (Group 2):")
        print(
            f"  python scripts/evaluate-skill.py "
            f"--skill {args.skill_name} "
            f"--candidates {output_dir}"
        )


if __name__ == "__main__":
    main()
