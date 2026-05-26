# Skill Gap Report — Vanilla Todo Pipeline Demo

Generated: 2026-05-26T06:16:34Z  
Re-audited: 2026-05-26T06:43:00Z  
Plan: `docs/superpowers/plans/2026-05-26-vanilla-todo-pipeline-demo.md`

## Summary

- Tasks audited: 10 (Task 0–9)
- Tasks covered: 0
- Gaps found: 10 (9 definite + 1 adjacent)
- Primary gaps (for future candidate generation): `cjk-ime-composition`, `pointer-events-flip-drag-sort`

**Method:** Manual skill-gap-detection audit — all 15 `skills/**/SKILL.md` files read in this session (not inferred from names). Per user scope: **no** `generate-candidates.py`, **no** `evaluate-skill.py`, **no** app implementation.

## Task Audit Table

| Task | Specific technique | Matching skill (path) | Assessment |
|------|-------------------|------------------------|------------|
| Task 0: Scaffold | Create static HTML/JS/CSS shell with `#app` mount and script linkage | — | Gap |
| Task 1: State + localStorage | Versioned `localStorage` load/save (`todos-v1`) with `load()`/`save()` on mutation | — | Gap |
| Task 2: Render DOM | Vanilla JS full re-render from in-memory state (`render()` rebuilds `<ul>`) | — | Gap |
| Task 3: Add via Enter | `keydown` Enter → `addTodo(text)`, clear input, re-render | — | Gap |
| Task 4: Toggle/delete | List-level event delegation by `data-id` (no per-item listeners) | — | Gap |
| Task 5: Clear done | Filter/remove `completed` todos, re-render and persist | — | Gap |
| Task 6: IME edit | `compositionstart`/`compositionend` + commit on blur/Enter only when `!composing` | — | Gap |
| Task 7: Drag sort | Pointer Events capture + FLIP sibling transforms + persist order | — | Gap |
| Task 8: Polish | CSS spacing, focus rings, completed strikethrough, drag handle states | — | Gap |
| Task 9: Manual E2E verify | Structured manual browser pass (add/toggle/delete/IME/drag/persistence) before completion | `skills/verification-before-completion/SKILL.md` | Gap (adjacent) |

**Skills library scanned (15 files, all read):** `brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `skill-gap-detection`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`.

**Notes:**

- Read `skills/test-driven-development/SKILL.md` — body covers red/green **process** only, not localStorage, DOM render loops, IME, or FLIP.
- Read `skills/verification-before-completion/SKILL.md` — covers evidence-before-claims and running verification commands, not a domain-specific manual browser checklist for todo/IME/drag scenarios.
- Read `skills/executing-plans/SKILL.md` and `skills/subagent-driven-development/SKILL.md` — plan **execution** workflow only; do not cover vanilla DOM techniques in Tasks 0–8.
- Plan contains sample code for Tasks 6–7; per `skill-gap-detection`, that does **not** remove the gap.

## Gaps

### Gap 1: static-scaffold

**Task(s):** Task 0 ("Scaffold files")

**Context:** Agent must create `demo-todo/index.html`, `app.js`, `styles.css` with HTML shell (`#app`, script tag) and verify empty list renders in browser. No SKILL.md guides vanilla static file scaffolding.

**Expected behavior with skill:** Agent creates minimal three-file layout, correct script linkage, opens in browser to confirm mount point works.

**Expected behavior without skill:** Agent may omit script tag, wrong paths, or skip browser sanity check.

**Suggested skill name:** `static-scaffold`

### Gap 2: vanilla-localstorage-state

**Task(s):** Task 1 ("State + localStorage")

**Context:** Persist in-memory `todos` array via `localStorage` key `todos-v1` with `load()`/`save()` on every mutation.

**Expected behavior with skill:** Agent uses consistent versioned key, safe JSON parse defaults, calls `save()` after each state change, verifies persistence on reload.

**Expected behavior without skill:** Agent forgets `save()`, uses ad-hoc keys, or throws on corrupt JSON.

**Suggested skill name:** `vanilla-localstorage-state`

### Gap 3: vanilla-dom-render-loop

**Task(s):** Task 2 ("Render DOM from state")

**Context:** Single `render()` rebuilds `<ul>` from state (checkbox, label, delete) and reflects mutations when called after state changes.

**Expected behavior with skill:** Agent implements idempotent render-from-state pattern without stale DOM nodes.

**Expected behavior without skill:** Agent patches DOM ad hoc, leaves orphaned nodes, or duplicates list items.

**Suggested skill name:** `vanilla-dom-render-loop`

### Gap 4: vanilla-enter-submit

**Task(s):** Task 3 ("Add via Enter")

**Context:** Text input listens for `keydown` Enter, calls `addTodo(text)`, clears input, re-renders.

**Expected behavior with skill:** Agent wires Enter-only submit (not accidental form submit), clears input, shows new item immediately.

**Expected behavior without skill:** Agent uses `submit` event incorrectly, forgets to clear input, or adds on every key.

**Suggested skill name:** `vanilla-enter-submit`

### Gap 5: vanilla-event-delegation

**Task(s):** Task 4 ("Toggle/delete via delegation")

**Context:** One list `click` handler toggles checkbox and deletes by `data-id` without per-item listeners.

**Expected behavior with skill:** Agent uses delegation on stable parent, identifies target via `data-id`, updates state then `render()`/`save()`.

**Expected behavior without skill:** Agent attaches listeners per row (memory leak on re-render) or mis-identifies click targets.

**Suggested skill name:** `vanilla-event-delegation`

### Gap 6: vanilla-clear-completed

**Task(s):** Task 5 ("Clear-done button")

**Context:** Button removes all todos with `completed: true`, re-renders and persists.

**Expected behavior with skill:** Agent filters array immutably or in place consistently, saves after batch remove.

**Expected behavior without skill:** Agent mutates during iteration incorrectly or forgets `save()`.

**Suggested skill name:** `vanilla-clear-completed`

### Gap 7: cjk-ime-composition

**Task(s):** Task 6 ("Edit with IME composition")

**Context:** Double-click label → inline `<input>` edit. Must track `composing` via `compositionstart`/`compositionend` and commit on blur or Enter only when `!composing` so CJK IME does not commit mid-composition.

**Expected behavior with skill:** Agent always gates `commitEdit` on `!composing`; tests IME path; avoids duplicate/truncated CJK text on Enter during composition.

**Expected behavior without skill:** Agent commits on Enter during composition, omits composition handlers, or duplicates todos.

**Suggested skill name:** `cjk-ime-composition`

### Gap 8: pointer-events-flip-drag-sort

**Task(s):** Task 7 ("Pointer Events drag sort (FLIP)")

**Context:** Reorder via `pointerdown` on handle → `setPointerCapture`, `pointermove` index math with FLIP sibling transforms, `pointerup` reorders `todos`, `save()`, `render()` without layout jump.

**Expected behavior with skill:** Agent implements pointer capture lifecycle, correct index math, FLIP measure→mutate→invert→play, persists order after drop.

**Expected behavior without skill:** Agent uses mouse-only events (breaks touch), skips FLIP (jumpy UI), or loses pointer capture on move.

**Suggested skill name:** `pointer-events-flip-drag-sort`

### Gap 9: minimalist-ui-polish

**Task(s):** Task 8 ("Minimalist polish")

**Context:** CSS for consistent spacing, accessible focus rings, completed strikethrough, drag handle cursor/active states.

**Expected behavior with skill:** Agent applies cohesive minimal styles and visible focus/drag affordances without over-design.

**Expected behavior without skill:** Agent ships unstyled or inconsistent UI; missing focus/drag feedback.

**Suggested skill name:** `minimalist-ui-polish`

### Gap 10: manual-e2e-checklist

**Task(s):** Task 9 ("End-to-end manual verification")

**Context:** Structured manual pass: add, toggle, delete, clear done, IME edit (中文), drag reorder, refresh persistence — document results before claiming complete. `verification-before-completion` covers run-command-then-claim process but not this domain-specific browser checklist.

**Expected behavior with skill:** Agent runs full checklist in browser, records evidence per step (especially IME and drag), does not claim done until all pass.

**Expected behavior without skill:** Agent claims complete after partial testing; skips IME or drag scenarios.

**Suggested skill name:** `manual-e2e-checklist`
