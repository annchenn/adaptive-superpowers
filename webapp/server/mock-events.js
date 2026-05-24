module.exports = [
  { timestamp: "2024-01-15T10:00:00Z", skill: "brainstorming", status: "started", data: {} },
  { timestamp: "2024-01-15T10:00:05Z", skill: "brainstorming", status: "completed", data: { summary: "探索用戶需求，確定 Web UI 架構方向" } },
  { timestamp: "2024-01-15T10:01:00Z", skill: "writing-plans", status: "started", data: {} },
  { timestamp: "2024-01-15T10:01:30Z", skill: "writing-plans", status: "completed", data: { plan_summary: "建立 Superpowers Pipeline Monitor", steps: ["建立 hooks 事件記錄", "實作後端 API", "實作前端 UI", "整合測試"] } },
  { timestamp: "2024-01-15T10:02:00Z", skill: "gap-detection", status: "started", data: {} },
  { timestamp: "2024-01-15T10:02:15Z", skill: "gap-detection", status: "completed", data: { gaps: [{ name: "data-migration", description: "需要處理資料庫 schema 遷移的 skill" }, { name: "api-testing", description: "缺少 API 端點自動測試的 skill" }] } },
  { timestamp: "2024-01-15T10:02:30Z", skill: "candidates-generated", status: "completed", data: { skill: "data-migration", count: 3, files: ["candidates/data-migration/v1.md", "candidates/data-migration/v2.md", "candidates/data-migration/v3.md"] } },
  { timestamp: "2024-01-15T10:03:00Z", skill: "evaluation-result", status: "completed", data: { winner: "v2.md", scores: { "v1": { compliance: 30, coverage: 22, conciseness: 20, total: 72 }, "v2": { compliance: 38, coverage: 28, conciseness: 22, total: 88 }, "v3": { compliance: 25, coverage: 20, conciseness: 25, total: 70 } } } },
  { timestamp: "2024-01-15T10:03:30Z", skill: "skill-deployed", status: "completed", data: { skill: "data-migration", version: "v2.md", diff_preview: "+ 加入 schema 遷移前的備份步驟\n+ 加入回滾機制\n- 移除不必要的日誌輸出" } },
  { timestamp: "2024-01-15T10:04:00Z", skill: "subagent-driven-development", status: "started", data: {} },
  { timestamp: "2024-01-15T10:05:00Z", skill: "subagent-driven-development", status: "completed", data: { tasks_completed: 4, tasks_total: 4 } }
];
