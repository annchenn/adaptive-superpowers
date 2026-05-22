// Cross-platform pipeline demo — runs on Windows / macOS / Linux.
// Usage: node demo.js   (requires the backend running on port 3001)

const API = 'http://localhost:3001/api/event';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendEvent(skill, status, data = {}) {
  try {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill, status, data }),
    });
    console.log(`sent: ${skill} ${status}`);
  } catch (err) {
    console.error(`failed: ${skill} ${status} — ${err.message}`);
    console.error('Is the backend running? (cd webapp && npm run dev:server)');
    process.exit(1);
  }
}

async function runStep(skill, data = {}) {
  await sendEvent(skill, 'started', data);
  await sleep(1000);
  await sendEvent(skill, 'completed', data);
  await sleep(1000);
}

async function main() {
  console.log('Starting Superpowers pipeline demo...');

  await runStep('brainstorming');
  await runStep('using-git-worktrees');
  await runStep('writing-plans');

  await runStep('gap-detection', {
    gap: 'Missing robust validation workflow',
    severity: 'medium',
  });

  await runStep('candidates-generated', {
    count: 3,
    candidates: ['validation-v1', 'validation-v2', 'validation-v3'],
  });

  await runStep('evaluation-result', {
    winner: 'validation-v2',
    scores: { v1: 72, v2: 88, v3: 65 },
  });

  await runStep('skill-deployed', {
    skillName: 'robust-validation',
  });

  await runStep('subagent-driven-development');
  await runStep('test-driven-development');
  await runStep('requesting-code-review');
  await runStep('finishing-a-development-branch');

  console.log('Demo completed.');
}

main();
