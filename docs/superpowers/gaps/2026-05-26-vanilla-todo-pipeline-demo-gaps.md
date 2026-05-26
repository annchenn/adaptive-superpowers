# Skill Gap Report — Vanilla Todo Pipeline Demo

Generated: 2026-05-26T00:00:00Z  
Plan: `docs/superpowers/plans/2026-05-26-vanilla-todo-pipeline-demo.md`

## Summary

- Tasks audited: 10 (Task 0–9)
- Tasks covered: 0
- Gaps found: 10
- Primary gaps (candidate generation): `cjk-ime-composition`, `pointer-events-flip-drag-sort`

## Task Audit Table

| Task | Specific technique | Matching skill (path) | Assessment |
|------|-------------------|------------------------|------------|
| Task 0: Scaffold | Create static HTML/JS/CSS files | — | Gap |
| Task 1: State + localStorage | `localStorage` load/save persistence | — | Gap |
| Task 2: Render DOM | Vanilla JS DOM rebuild from state | — | Gap |
| Task 3: Add via Enter | `keydown` Enter submit pattern | — | Gap |
| Task 4: Toggle/delete | Event delegation on list container | — | Gap |
| Task 5: Clear done | Filter completed + batch remove | — | Gap |
| Task 6: IME edit | `compositionstart`/`compositionend` CJK-safe commit | — | Gap |
| Task 7: Drag sort | Pointer Events + FLIP sibling transforms | — | Gap |
| Task 8: Polish | Spacing, focus rings, micro UI consistency | — | Gap |
| Task 9: Manual E2E verify | Structured manual test pass before completion | `skills/verification-before-completion/SKILL.md` | Gap (adjacent) |

**Notes:** Read `skills/test-driven-development/SKILL.md` — body covers red/green **process** only, not localStorage, FLIP, or IME. Plan contains sample code for Tasks 6–7; per `skill-gap-detection`, that does **not** remove the gap.

## Gaps

### Gap 1: cjk-ime-composition

**Task(s):** Task 6 ("Edit with IME composition")

**Context:** Inline edit must not commit on Enter mid-composition when using CJK input methods. Requires `compositionstart`/`compositionend` flag and guarded commit on blur/Enter.

**Expected behavior with skill:** Agent always gates commit on `!composing`; tests IME path explicitly; does not duplicate todos on Enter during composition.

**Expected behavior without skill:** Agent commits on Enter during composition or omits composition handlers; duplicate or truncated CJK text.

**Suggested skill name:** `cjk-ime-composition`

### Gap 2: pointer-events-flip-drag-sort

**Task(s):** Task 7 ("Pointer Events drag sort (FLIP)")

**Context:** Reorder list items via Pointer Events capture, animate siblings with FLIP (measure → mutate → invert transforms → play), persist new order.

**Expected behavior with skill:** Agent implements capture/`setPointerCapture`, index math, FLIP without layout jump, saves order after `pointerup`.

**Expected behavior without skill:** Agent uses mouse events only, breaks on touch, or reorders without FLIP (jumpy UI).

**Suggested skill name:** `pointer-events-flip-drag-sort`

### Gap 3: vanilla-localstorage-state

**Task(s):** Task 1

**Context:** Persist in-memory todo array to `localStorage` with versioned key and safe parse defaults.

**Expected behavior with skill:** Agent uses consistent key, handles corrupt JSON, calls save on every mutation.

**Expected behavior without skill:** Agent forgets save, uses ad-hoc keys, or throws on bad JSON.

**Suggested skill name:** `vanilla-localstorage-state`

### Gap 4–10 (abbreviated)

| Gap name | Task(s) | Suggested skill name |
|----------|---------|----------------------|
| vanilla-dom-render-loop | 2 | `vanilla-dom-render-loop` |
| vanilla-enter-submit | 3 | `vanilla-enter-submit` |
| vanilla-event-delegation | 4 | `vanilla-event-delegation` |
| vanilla-clear-completed | 5 | `vanilla-clear-completed` |
| minimalist-ui-polish | 8 | `minimalist-ui-polish` |
| manual-e2e-checklist | 9 | `manual-e2e-checklist` |
| static-scaffold | 0 | `static-scaffold` |
