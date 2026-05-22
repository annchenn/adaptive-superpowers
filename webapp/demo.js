// Full pipeline showcase — runs on Windows / macOS / Linux.
// Usage: node demo.js   (backend must be running on port 3001)
//
// Drives the entire 11-step pipeline with realistic sub-events (decisions,
// files, progress), correct evaluation data, the evaluation dashboard, and
// auto-finishes at the end.

const BASE = process.env.MONITOR_URL || 'http://localhost:3001';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  try {
    await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`request failed (${path}): ${err.message}`);
    console.error('Is the backend running? (cd webapp && npm run dev:server)');
    process.exit(1);
  }
}

const event = (skill, status, data = {}) => post('/api/event', { skill, status, data });
const sub = (subType, data) => post('/api/sub-event', { subType, data });

// Run a phase: start → emit sub-events in order → complete (with detail data).
async function phase(skill, { subs = [], data = {} } = {}) {
  await event(skill, 'started');
  console.log(`▶ ${skill}`);
  await sleep(700);
  for (const s of subs) {
    await sub(s.type, s.data);
    await sleep(450);
  }
  await event(skill, 'completed', data);
  await sleep(700);
}

async function main() {
  console.log('Starting full Superpowers pipeline demo...');
  await post('/api/control/clear', {});
  await sleep(500);

  // 1. Brainstorming — decisions + spec file
  await phase('brainstorming', {
    subs: [
      { type: 'todo', data: { done: 0, total: 4, current: 'Exploring project context' } },
      { type: 'question', data: { question: '網頁用途', answer: '個人作品集 / 履歷' } },
      { type: 'question', data: { question: '內容區塊', answer: 'About / Skills / Projects / Contact' } },
      { type: 'question', data: { question: '技術做法', answer: 'HTML + CSS + JS 分檔' } },
      { type: 'question', data: { question: '視覺風格', answer: '簡約乾淨 Minimal' } },
      { type: 'todo', data: { done: 3, total: 4, current: 'Writing design doc' } },
      { type: 'file', data: { path: 'specs/2026-05-23-portfolio-design.md', action: 'write' } },
      { type: 'todo', data: { done: 4, total: 4, current: '' } },
    ],
    data: { summary: '簡約風個人作品集，單頁捲動 + 專案手風琴互動' },
  });

  // 2. Git worktree
  await phase('using-git-worktrees', {
    data: { branch: 'feature/portfolio', path: '/tmp/worktrees/portfolio' },
  });

  // 3. Writing plans — plan file + steps
  await phase('writing-plans', {
    subs: [
      { type: 'todo', data: { done: 0, total: 1, current: 'Drafting implementation plan' } },
      { type: 'file', data: { path: 'plans/2026-05-23-portfolio.md', action: 'write' } },
      { type: 'todo', data: { done: 1, total: 1, current: '' } },
    ],
    data: {
      plan_summary: '9 個小任務：骨架 → 樣式 → 各區塊 → 手風琴 → 響應式',
      steps: ['專案骨架', '基礎樣式', 'About', 'Skills', 'Projects 手風琴', 'Contact', '響應式'],
    },
  });

  // 4. Gap detection (G1)
  await phase('gap-detection', {
    data: {
      gaps: [
        { name: 'accordion-a11y', description: '缺少無障礙手風琴的實作 skill：鍵盤操作與 aria 狀態' },
        { name: 'responsive-nav', description: '缺少響應式導覽列設計規範' },
      ],
    },
  });

  // 5. Candidate generation (G1)
  await phase('candidates-generated', {
    data: {
      skill: 'accordion-a11y',
      count: 3,
      files: [
        'candidates/accordion-a11y/v1.md',
        'candidates/accordion-a11y/v2.md',
        'candidates/accordion-a11y/v3.md',
      ],
    },
  });

  // 6. Evaluation (G2) — event detail + dashboard
  const evalLog = {
    skill: 'accordion-a11y',
    winner: 'v2.md',
    candidates: [
      { file: 'v1.md', scores: { compliance: 30, coverage: 22, conciseness: 20 }, total: 72 },
      { file: 'v2.md', scores: { compliance: 38, coverage: 28, conciseness: 22 }, total: 88 },
      { file: 'v3.md', scores: { compliance: 25, coverage: 20, conciseness: 20 }, total: 65 },
    ],
  };
  await post('/api/evaluation-log', evalLog);
  await phase('evaluation-result', {
    data: {
      winner: 'v2.md',
      scores: {
        v1: { compliance: 30, coverage: 22, conciseness: 20, total: 72 },
        v2: { compliance: 38, coverage: 28, conciseness: 22, total: 88 },
        v3: { compliance: 25, coverage: 20, conciseness: 20, total: 65 },
      },
    },
  });

  // 7. Skill deployed (G2)
  await phase('skill-deployed', {
    data: {
      skill: 'accordion-a11y',
      version: 'v2.md',
      diff_preview: '+ 加入 aria-expanded 狀態切換\n+ 加入鍵盤 Enter/Space 操作\n+ 加入單一展開邏輯\n- 移除滑鼠專屬的 hover 展開',
    },
  });

  // 8. Execution — files nested under progress steps
  await phase('subagent-driven-development', {
    subs: [
      { type: 'todo', data: { done: 0, total: 3, current: '建立骨架' } },
      { type: 'file', data: { path: 'test/index.html', action: 'write' } },
      { type: 'file', data: { path: 'test/style.css', action: 'write' } },
      { type: 'todo', data: { done: 1, total: 3, current: '加入手風琴互動' } },
      { type: 'file', data: { path: 'test/script.js', action: 'write' } },
      { type: 'todo', data: { done: 2, total: 3, current: '響應式調整' } },
      { type: 'file', data: { path: 'test/style.css', action: 'edit' } },
      { type: 'todo', data: { done: 3, total: 3, current: '' } },
    ],
    data: { tasks_completed: 9, tasks_total: 9 },
  });

  // 9. TDD
  await phase('test-driven-development', {
    data: { tests_written: 8, tests_passed: 8, cycles: ['RED → GREEN → REFACTOR'] },
  });

  // 10. Code review
  await phase('requesting-code-review', {
    data: {
      verdict: 'approved',
      issues_critical: 0,
      issues_important: 1,
      issues_minor: 2,
      summary: '結構清楚，無障礙到位。建議：抽出重複的 section padding 變數。',
    },
  });

  // 11. Finish branch (fires confetti + slime in the UI)
  await phase('finishing-a-development-branch', {
    data: { action: 'merge', branch: 'feature/portfolio', tests_verified: true },
  });

  console.log('Demo completed. 🎉');
}

main();
