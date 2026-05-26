# Vanilla JS Todo — Pipeline Demo Design

**Goal:** Minimal todo app to exercise the adaptive-superpowers pipeline (writing-plans → gap detection → candidates).

## Requirements

- Vanilla HTML/CSS/JS (no framework)
- State in memory + `localStorage`
- Add via Enter, toggle/delete via event delegation
- Clear completed button
- **Inline edit with CJK IME** (`compositionstart` / `compositionend` — no duplicate commits mid-composition)
- **Drag reorder** via Pointer Events with FLIP-style sibling transforms
- Minimal visual polish (spacing, focus states)
- Manual end-to-end verification checklist before done

## Out of scope

- Backend, auth, tests in CI (manual verify only for demo)

## Approved

Demo fixture for Group 1 gap-detection integration test (2026-05-26).
