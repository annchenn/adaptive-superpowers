# Vanilla JS Todo Pipeline Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Build the vanilla todo app described in `docs/superpowers/specs/2026-05-26-vanilla-todo-pipeline-demo-design.md`.

**Architecture:** Single-page app: `app.js` holds state and DOM updates; `index.html` shell; `styles.css` for layout.

**Tech Stack:** Vanilla JS, Pointer Events API, localStorage

---

### Task 0: Scaffold files

**Files:**
- Create: `demo-todo/index.html`, `demo-todo/app.js`, `demo-todo/styles.css`

- [ ] **Step 1:** Create HTML shell with `#app`, script tag for `app.js`
- [ ] **Step 2:** Open `index.html` in browser — empty list renders

---

### Task 1: State + localStorage

**Files:**
- Modify: `demo-todo/app.js`

- [ ] **Step 1:** Define `todos` array, `load()` / `save()` using `localStorage` key `todos-v1`
- [ ] **Step 2:** Reload page — state persists

---

### Task 2: Render DOM from state

**Files:**
- Modify: `demo-todo/app.js`, `demo-todo/index.html`

- [ ] **Step 1:** `render()` builds `<ul>` of items (checkbox, label, delete)
- [ ] **Step 2:** Mutate state and call `render()` — UI updates

---

### Task 3: Add via Enter

**Files:**
- Modify: `demo-todo/app.js`, `demo-todo/index.html`

- [ ] **Step 1:** Input + `keydown` Enter calls `addTodo(text)`
- [ ] **Step 2:** New item appears, input clears

---

### Task 4: Toggle/delete via delegation

**Files:**
- Modify: `demo-todo/app.js`

- [ ] **Step 1:** List `click` handler: toggle checkbox, delete button by `data-id`
- [ ] **Step 2:** Verify toggle and delete without per-item listeners

---

### Task 5: Clear-done button

**Files:**
- Modify: `demo-todo/app.js`, `demo-todo/index.html`

- [ ] **Step 1:** Button removes all `completed` todos, re-render

---

### Task 6: Edit with IME composition

**Files:**
- Modify: `demo-todo/app.js`

- [ ] **Step 1:** Double-click label → `<input>` inline edit
- [ ] **Step 2:** Track `composing` flag on `compositionstart` / `compositionend`
- [ ] **Step 3:** Commit on `blur` or Enter only when `!composing` (CJK safe)

```javascript
let composing = false;
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; });
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !composing) commitEdit();
});
```

---

### Task 7: Pointer Events drag sort (FLIP)

**Files:**
- Modify: `demo-todo/app.js`, `demo-todo/styles.css`

- [ ] **Step 1:** `pointerdown` on handle → capture pointer, record indices
- [ ] **Step 2:** `pointermove` — compute target index, FLIP translate siblings
- [ ] **Step 3:** `pointerup` — reorder `todos` array, `save()`, `render()` without animation jump

```javascript
// FLIP: First positions → invert with transform → Play after reorder
function flipReorder(listEl, mutateOrder) {
  const first = [...listEl.children].map((el) => el.getBoundingClientRect());
  mutateOrder();
  render();
  const last = [...listEl.children].map((el) => el.getBoundingClientRect());
  // apply transform from (first - last), then transition to 0
}
```

---

### Task 8: Minimalist polish

**Files:**
- Modify: `demo-todo/styles.css`

- [ ] **Step 1:** Consistent spacing, focus rings, completed strikethrough
- [ ] **Step 2:** Drag handle cursor and active state

---

### Task 9: End-to-end manual verification

**Files:**
- None (checklist only)

- [ ] **Step 1:** Run through: add, toggle, delete, clear done, IME edit (中文), drag reorder, refresh persistence
- [ ] **Step 2:** Document results in session before claiming complete
