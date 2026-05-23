---
name: skill-gap-detection
description: Use when an implementation plan has been written and you need to check whether existing skills cover every task, or when a task requires a technique that no current skill addresses.
---

# Skill Gap Detection

## Overview

Systematically audit each task in an implementation plan against the available skill library. Produce a structured gap report for every task that lacks a guiding skill, then trigger multi-candidate generation for each gap.

## When to Use

- After `writing-plans` completes and before execution begins
- When adding a new task type not seen before in this codebase
- When a subagent repeatedly fails or produces poor results on a class of tasks

**Do NOT use:**
- To audit skills themselves (use `superpowers:writing-skills` for that)
- On single trivial tasks that clearly match an existing skill

## Detection Algorithm

```
for each task T in plan:
    candidates = skills that MIGHT apply (name/description fuzzy match)
    if candidates is empty:
        → definite gap
    else:
        for each candidate skill S:
            does S cover the SPECIFIC technique T needs?
        if none cover it:
            → gap (existing skills are adjacent but insufficient)
        else:
            → covered, skip
```

### Fuzzy Match Heuristics

When checking if a skill covers a task, look for:

1. **Verb overlap** — task says "deploy to Kubernetes", skill name contains "kubernetes" or "deploying"
2. **Domain overlap** — task involves "OAuth", skill covers "authentication"
3. **Technique overlap** — task requires "retry with backoff", skill covers "resilience patterns"

Reject false positives: a skill about "writing database migrations" does **not** cover "designing the database schema."

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
| Task matches skill name but skill covers different variant | Gap → note the distinction in context |
| Task matches skill AND technique | Covered → skip |
| Skill exists but is project-specific (in CLAUDE.md) | Covered → skip |
| Unsure | Treat as gap — false positives are cheap, false negatives hurt |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Marking tasks covered because a vaguely related skill exists | Re-check: does the skill cover the **specific** technique needed? |
| Writing gap context without expected behavior | Both fields are required — evaluators need them to design pressure tests |
| Generating candidates before writing the gap report | Write the report first; it is the source of truth for candidate prompts |
| Only finding gaps for unfamiliar technologies | Also check unfamiliar patterns even in familiar tech (e.g., saga pattern in a Node.js app) |
