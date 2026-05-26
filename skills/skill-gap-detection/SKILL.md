---
name: skill-gap-detection
description: Use when an implementation plan has been written and you need to check whether existing skills cover every task, or when a task requires a technique that no current skill addresses.
---

# Skill Gap Detection

## Overview

Systematically audit each task in an implementation plan against the **skill library only** (SKILL.md files on disk). Produce a structured gap report for every task that lacks a guiding skill, then trigger multi-candidate generation for each gap.

**Critical:** You are checking whether a **skill exists**, not whether the agent can complete the task. A detailed plan with complete code does **not** remove a gap.

<HARD-GATE>
Do NOT write `No skill gaps detected.` or proceed to execution handoff until you have: (1) listed every plan task in the audit table, (2) read matching SKILL.md files for any candidate skill, and (3) run candidate generation + evaluation for every reported gap. Skipping because tasks "look standard" or the plan "already has the code" is invalid.
</HARD-GATE>

## What Counts as "Covered"

A task is covered **only** when **all** of the following are true:

1. A SKILL.md file exists in `skills/` or `~/.claude/skills/` (or project plugin skills path).
2. You have **read** that file in this session — not inferred from the skill name alone.
3. The skill's content addresses the **specific technique** the task requires (not a adjacent/generic topic).

**Never counts as coverage:**

| Invalid reason | Why |
|----------------|-----|
| Plan contains complete code or algorithms | Plans guide one run; skills guide all future runs of this technique |
| "Agent default ability" / "standard JS/Python" | Gap detection is about the library, not model priors |
| "Trivial" or "self-contained in the plan" | Trivial only if a skill explicitly covers the technique |
| Skill name sounds related but body does not | e.g. TDD skill does not cover sliding-window deque math |
| "A skill would only help if the plan were vague" | This rationalization is always wrong — reject it |

## Anti-Pattern: "Covered by Plan Content"

Implementation plans are **supposed** to be detailed (`writing-plans` requires complete code per step). That does **not** mean skills are unnecessary.

If Task 8 needs Pointer Events + FLIP reordering and no SKILL.md covers that technique → **report a gap**, even when the plan pastes working code. The gap is "no reusable skill guides this technique," not "can the implementer type this once."

## When to Use

- After `writing-plans` completes and before execution begins
- When adding a new task type not seen before in this codebase
- When a subagent repeatedly fails or produces poor results on a class of tasks

**Do NOT use:**
- To audit skills themselves (use `superpowers:writing-skills` for that)

## Detection Algorithm

```
for each task T in plan:
    technique = the specific method/pattern T requires (not "write code" generically)
    candidates = SKILL.md files whose name/description might apply
    IGNORE plan code, agent priors, and task familiarity

    if no candidates:
        → gap
    else:
        for each candidate S:
            READ S's SKILL.md
            does S's body cover `technique`?
        if none cover technique:
            → gap (adjacent skill exists but insufficient)
        else:
            → covered (record skill path in audit table)
```

Produce the **Task Audit Table** (below) before writing the gap report. Every task must appear in the table with an explicit Assessment.

### Fuzzy Match Heuristics

When checking if a skill covers a task, look for:

1. **Verb overlap** — task says "deploy to Kubernetes", skill name contains "kubernetes" or "deploying"
2. **Domain overlap** — task involves "OAuth", skill covers "authentication"
3. **Technique overlap** — task requires "retry with backoff", skill covers "resilience patterns"

Reject false positives: a skill about "writing database migrations" does **not** cover "designing the database schema."

## Required: Task Audit Table

Before the gap report, output this table in chat (and include it in the gap report file). **Every** plan task must have a row.

| Task | Specific technique | Matching skill (path) | Assessment |
|------|-------------------|------------------------|------------|
| Task 0: Scaffold | Create package dirs/files | — | Covered only if `SKILL.md` covers it; else Gap |
| Task 7: IME edit | `compositionstart`/`compositionend` handling | — or `skills/.../SKILL.md` | Gap if no skill covers CJK IME — **not** "covered by plan" |
| Task 8: Drag sort | Pointer Events + FLIP sibling transforms | — | Gap if no skill covers this technique |

**Assessment values (use exactly one):**

- `Covered` — cite the SKILL.md path you read; technique is in the skill body
- `Gap` — no skill, or only adjacent/insufficient skill
- `Gap (adjacent)` — related skill exists but does not cover this technique (still report in Gaps section)

Forbidden assessment values: `Covered by plan content`, `Default ability`, `Trivial`, `Standard`.

## Gap Report Format

Save to: `docs/superpowers/gaps/YYYY-MM-DD-<feature-name>-gaps.md`

```markdown
# Skill Gap Report — <Feature Name>
Generated: <ISO timestamp>
Plan: <path to plan file>

## Summary
- Tasks audited: N
- Tasks covered: N
- Gaps found: N

## Task Audit Table

| Task | Specific technique | Matching skill (path) | Assessment |
|------|-------------------|------------------------|------------|
| … | … | … | Covered / Gap / Gap (adjacent) |

## Gaps

### Gap <N>: <short-name>
**Task(s):** Task 3 ("Set up Redis caching layer"), Task 7 ("Cache invalidation")
**Context:** Agent must configure Redis with TTL policies and implement cache-aside pattern. No existing skill covers caching strategy or Redis configuration.
**Expected behavior with skill:** Agent selects appropriate TTL values, implements cache-aside correctly, avoids thundering herd.
**Expected behavior without skill:** Agent either skips TTL or uses arbitrary values; may implement cache-through instead.
**Suggested skill name:** `redis-caching-patterns`
```

## Triggering Candidate Generation

For each gap, call:

```bash
python scripts/generate-candidates.py \
  --skill-name "<suggested-skill-name>" \
  --context "<context description>" \
  --expected-behavior "<expected behavior>" \
  --candidates 3 \
  --output-dir candidates/
```

After all candidates are written, hand off to Group 2:

```bash
python scripts/evaluate-skill.py \
  --skill "<skill-name>" \
  --candidates "candidates/<skill-name>"
```

Append events to `events.jsonl`:

```json
{ "timestamp": "<ISO>", "skill": "skill-gap-detection", "status": "completed", "data": { "gaps": ["<name1>", "<name2>"] } }
{ "timestamp": "<ISO>", "skill": "skill-gap-detection", "status": "candidates-generated", "data": { "skill": "<name>", "count": 3 } }
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Task has no matching skill name | Definite gap → add to report |
| Plan has full code for the technique | Still gap if no SKILL.md covers the technique |
| Task matches skill name but skill body covers different variant | Gap (adjacent) → note distinction |
| Task matches skill AND technique in skill body | Covered → cite path in audit table |
| Skill exists but is project-specific (in CLAUDE.md) | Covered → cite CLAUDE.md section |
| Process skill applies (TDD, verification) | Covered **only** for process steps — not domain technique in same task |
| Unsure | Treat as gap — false positives are cheap, false negatives hurt |
| All tasks "look standard" | Run the audit table anyway; standard ≠ covered |

## Red Flags — STOP and Re-Audit

If you catch yourself thinking any of these, your audit is wrong:

- "The plan already has complete code, so no skill needed"
- "Tasks look familiar / standard, I'll skip gap detection"
- "TDD covers tasks 1–4" (when tasks also need domain-specific techniques)
- "Implementer can just type it from the plan"
- "A skill would only help if the plan were vague"
- Assessment column uses anything other than Covered / Gap / Gap (adjacent)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Marking tasks covered because a vaguely related skill exists | Read the SKILL.md; skill must cover the **specific** technique |
| Using "Covered by plan content" in the audit table | Forbidden — plan detail is irrelevant to gap detection |
| Treating agent default knowledge as coverage | Only on-disk skills (or CLAUDE.md project rules) count |
| Writing gap context without expected behavior | Both fields required — evaluators need them for pressure tests |
| Generating candidates before writing the gap report | Write audit table + report first |
| Only finding gaps for unfamiliar technologies | Niche patterns in familiar stacks count (IME, FLIP, saga, cache-aside) |
| Reporting zero gaps without a completed audit table | Complete the table for every task first |
