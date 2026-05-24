#!/usr/bin/env node
// Pipeline Monitor hook — reads a Claude Code hook payload from stdin and
// posts events to the Web UI. Handles both Skill boundaries (started/completed)
// and sub-events (file writes, questions, todo progress).
//
// Wired via .claude/hooks.json on PreToolUse / PostToolUse.

const API = 'http://localhost:3001';

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  run(payload).catch(() => {}).finally(() => process.exit(0));
});

async function run(payload) {
  const tool = payload.tool_name;
  const phase = payload.hook_event_name; // PreToolUse | PostToolUse
  const input = payload.tool_input || {};
  const response = payload.tool_response || {};

  if (tool === 'Skill') {
    // Only mark the phase start. The Skill tool returns right after loading
    // its instructions, so its PostToolUse does NOT mean the phase finished —
    // the server completes a phase when the next one starts.
    if (phase !== 'PreToolUse') return;
    const skill = String(input.skill || '').replace(/^[^:]*:/, '');
    if (!skill) return;
    await post('/api/event', { skill, status: 'started', data: {} });
    return;
  }

  // Sub-events only fire after the tool finishes.
  if (phase !== 'PostToolUse') return;

  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
    const path = input.file_path || input.notebook_path || '';
    if (path) {
      await post('/api/sub-event', {
        subType: 'file',
        data: { path: shortPath(path), action: tool.toLowerCase() },
      });
    }
  } else if (tool === 'AskUserQuestion') {
    for (const qa of extractQA(input, response)) {
      await post('/api/sub-event', { subType: 'question', data: qa });
    }
  } else if (tool === 'TodoWrite') {
    const todos = Array.isArray(input.todos) ? input.todos : [];
    if (todos.length > 0) {
      const done = todos.filter((t) => t.status === 'completed').length;
      const active = todos.find((t) => t.status === 'in_progress');
      await post('/api/sub-event', {
        subType: 'todo',
        data: {
          done,
          total: todos.length,
          current: active ? active.activeForm || active.content || '' : '',
        },
      });
    }
  }
}

function extractQA(input, response) {
  const questions = Array.isArray(input.questions) ? input.questions : [];
  const out = [];
  for (const q of questions) {
    const label = q.header || q.question || '';
    let answer = '';
    if (response && typeof response === 'object') {
      answer =
        response[q.question] ||
        response[label] ||
        (response.answers && (response.answers[q.question] || response.answers[label])) ||
        '';
    }
    out.push({ question: label, answer: String(answer) });
  }
  return out;
}

function shortPath(p) {
  const parts = String(p).replace(/\\/g, '/').split('/');
  return parts.slice(-2).join('/');
}

async function post(path, body) {
  try {
    await fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* server not running or slow — ignore so tool calls never block */
  }
}
