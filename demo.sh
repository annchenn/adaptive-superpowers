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
step "Step 1/7 — Brainstorming..."
bash "$LOG" brainstorming started '{}'
sleep 3
bash "$LOG" brainstorming completed '{"summary":"探索用戶需求：需要一個 Web UI 監控 Superpowers pipeline 執行狀態"}'
done_msg "Brainstorming complete"
sleep 2

# ── Step 2: Writing Plans ────────────────────────────────────────────
step "Step 2/7 — Writing Plans..."
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

# ── Step 3: Gap Detection ────────────────────────────────────────────
step "Step 3/7 — Gap Detection..."
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

# ── Step 4: Candidate Generation ────────────────────────────────────
step "Step 4/7 — Generating skill candidates..."
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

# ── Step 5: Evaluation ───────────────────────────────────────────────
step "Step 5/7 — Evaluating candidates..."
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

# ── Step 6: Skill Deployed ───────────────────────────────────────────
step "Step 6/7 — Deploying winning skill..."
bash "$LOG" skill-deployed completed '{
  "skill": "realtime-dashboard",
  "version": "v2.md",
  "diff_preview": "+ 加入 Socket.io 雙向通訊架構說明\n+ 加入 chokidar 檔案監聽最佳實踐\n+ 加入 React useEffect cleanup 規範\n- 移除過時的 polling 方案\n- 移除不必要的 REST fallback"
}'
done_msg "realtime-dashboard skill deployed → check SkillLibrary for NEW badge"
sleep 2

# ── Step 7: Execution ────────────────────────────────────────────────
step "Step 7/7 — Executing plan with new skill..."
bash "$LOG" subagent-driven-development started '{}'
sleep 5
bash "$LOG" subagent-driven-development completed '{
  "tasks_completed": 6,
  "tasks_total": 6
}'
done_msg "All tasks complete!"

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Demo complete! Full pipeline executed.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Try in the UI:"
echo "  • Click each pipeline step to see detail panel"
echo "  • Check GapDetectionPanel for 2 detected gaps"
echo "  • Check EvaluationDashboard — v2 wins with 95/100"
echo "  • Check SkillLibrary for [NEW] badge on realtime-dashboard"
echo "  • Click 'CSV ↓' in EvaluationDashboard to export scores"
echo ""
