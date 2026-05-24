#!/bin/bash
# Superpowers Pipeline Monitor — Demo Script
# Usage: bash demo.sh
# Make sure the backend server is running: cd webapp && npm run dev:server

REPO="$(cd "$(dirname "$0")" && pwd)"
LOG="$REPO/hooks/log-event.sh"
EVENTS="$REPO/events.jsonl"

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

step() { echo -e "${CYAN}[demo]${NC} $1"; }
done_msg() { echo -e "${GREEN}✓${NC} $1"; }

# ── 清除舊資料 ──────────────────────────────────────────────────────
step "Clearing previous events..."
rm -f "$EVENTS"
sleep 1

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Superpowers Pipeline Monitor — Live Demo${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Open browser: http://localhost:5173"
echo "Watch the UI update in real-time!"
echo ""
sleep 2

# ── Step 1: Brainstorming ────────────────────────────────────────────
step "Step 1/11 — Brainstorming..."
bash "$LOG" brainstorming started '{}'
sleep 3
bash "$LOG" brainstorming completed '{"summary":"探索用戶需求：需要一個 Web UI 監控 Superpowers pipeline 執行狀態"}'
done_msg "Brainstorming complete"
sleep 2

# ── Step 2: Git Worktree ─────────────────────────────────────────────
step "Step 2/11 — Setting up git worktree..."
bash "$LOG" using-git-worktrees started '{}'
sleep 2
bash "$LOG" using-git-worktrees completed '{
  "branch": "feature/pipeline-monitor",
  "path": "/tmp/worktrees/pipeline-monitor"
}'
done_msg "Worktree created on feature/pipeline-monitor"
sleep 2

# ── Step 3: Writing Plans ────────────────────────────────────────────
step "Step 3/11 — Writing Plans..."
bash "$LOG" writing-plans started '{}'
sleep 4
bash "$LOG" writing-plans completed '{
  "plan_summary": "建立 Superpowers Pipeline Monitor Web UI",
  "steps": [
    "建立 Event Logging hooks 系統",
    "實作 Node.js + Socket.io 後端",
    "實作 React + Vite 前端",
    "整合 G1 Gap Detection",
    "整合 G2 Evaluation System",
    "錄製 Demo 影片"
  ]
}'
done_msg "Plan written"
sleep 2

# ── Step 4: Gap Detection ────────────────────────────────────────────
step "Step 4/11 — Gap Detection (G1)..."
bash "$LOG" gap-detection started '{}'
sleep 3
bash "$LOG" gap-detection completed '{
  "gaps": [
    {
      "name": "realtime-dashboard",
      "description": "缺少即時資料視覺化 skill：如何設計 WebSocket 推送架構"
    },
    {
      "name": "event-schema-design",
      "description": "缺少事件格式設計 skill：跨組事件格式標準化規範"
    }
  ]
}'
done_msg "2 gaps detected → check GapDetectionPanel"
sleep 2

# ── Step 5: Candidate Generation ────────────────────────────────────
step "Step 5/11 — Generating skill candidates (G1)..."
bash "$LOG" candidates-generated completed '{
  "skill": "realtime-dashboard",
  "count": 3,
  "files": [
    "candidates/realtime-dashboard/v1.md",
    "candidates/realtime-dashboard/v2.md",
    "candidates/realtime-dashboard/v3.md"
  ]
}'
done_msg "3 candidates generated for realtime-dashboard"
sleep 2

# ── Step 6: Evaluation ───────────────────────────────────────────────
step "Step 6/11 — Evaluating candidates (G2)..."
sleep 4
bash "$LOG" evaluation-result completed '{
  "winner": "v2.md",
  "scores": {
    "v1": { "compliance": 28, "coverage": 20, "conciseness": 18, "total": 66 },
    "v2": { "compliance": 40, "coverage": 30, "conciseness": 25, "total": 95 },
    "v3": { "compliance": 33, "coverage": 24, "conciseness": 22, "total": 79 }
  }
}'
done_msg "Winner: v2 (95/100) → check EvaluationDashboard"
sleep 2

# ── Step 7: Skill Deployed ───────────────────────────────────────────
step "Step 7/11 — Deploying winning skill (G2)..."
bash "$LOG" skill-deployed completed '{
  "skill": "realtime-dashboard",
  "version": "v2.md",
  "diff_preview": "+ 加入 Socket.io 雙向通訊架構說明\n+ 加入 chokidar 檔案監聽最佳實踐\n+ 加入 React useEffect cleanup 規範\n- 移除過時的 polling 方案\n- 移除不必要的 REST fallback"
}'
done_msg "realtime-dashboard skill deployed → check SkillLibrary for NEW badge"
sleep 2

# ── Step 8: Execution ────────────────────────────────────────────────
step "Step 8/11 — Executing plan with new skill..."
bash "$LOG" subagent-driven-development started '{}'
sleep 5
bash "$LOG" subagent-driven-development completed '{
  "tasks_completed": 6,
  "tasks_total": 6
}'
done_msg "All 6 tasks complete"
sleep 2

# ── Step 9: TDD ──────────────────────────────────────────────────────
step "Step 9/11 — Test-Driven Development..."
bash "$LOG" test-driven-development started '{}'
sleep 3
bash "$LOG" test-driven-development completed '{
  "tests_written": 12,
  "tests_passed": 12,
  "cycles": ["RED → GREEN → REFACTOR"]
}'
done_msg "12/12 tests passing"
sleep 2

# ── Step 10: Code Review ─────────────────────────────────────────────
step "Step 10/11 — Requesting Code Review..."
bash "$LOG" requesting-code-review started '{}'
sleep 3
bash "$LOG" requesting-code-review completed '{
  "verdict": "approved",
  "issues_critical": 0,
  "issues_important": 1,
  "issues_minor": 2,
  "summary": "Code is well-structured. Minor: rename variable for clarity."
}'
done_msg "Code review approved"
sleep 2

# ── Step 11: Finish Branch ───────────────────────────────────────────
step "Step 11/11 — Finishing development branch..."
bash "$LOG" finishing-a-development-branch started '{}'
sleep 2
bash "$LOG" finishing-a-development-branch completed '{
  "action": "merge",
  "branch": "feature/pipeline-monitor",
  "tests_verified": true
}'
done_msg "Branch merged — pipeline complete!"

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Demo complete! Full pipeline executed.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Try in the UI:"
echo "  • Pipeline now shows all 11 steps (Superpowers + G1/G2 adaptive)"
echo "  • Steps 4-5 have [G1·Adaptive] badge, steps 6-7 have [G2·Adaptive] badge"
echo "  • Click each step to see detail panel"
echo "  • Check GapDetectionPanel for 2 detected gaps"
echo "  • Check EvaluationDashboard — v2 wins with 95/100"
echo "  • Check SkillLibrary for [NEW] badge on realtime-dashboard"
echo "  • Click 'CSV ↓' in EvaluationDashboard to export scores"
echo ""
