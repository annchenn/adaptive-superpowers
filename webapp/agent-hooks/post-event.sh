#!/usr/bin/env bash
# Pipeline Monitor hook — auto-posts Skill tool events to the Web UI.
# Triggered by Claude Code's PreToolUse / PostToolUse on the Skill tool.

PAYLOAD=$(cat)

# Extract fields without jq (POSIX-ish parsing)
TOOL_NAME=$(printf '%s' "$PAYLOAD" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/')
EVENT_NAME=$(printf '%s' "$PAYLOAD" | grep -o '"hook_event_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/')
SKILL=$(printf '%s' "$PAYLOAD" | grep -o '"skill"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/')

# Only act on Skill tool with a skill name
[ "$TOOL_NAME" = "Skill" ] || exit 0
[ -n "$SKILL" ] || exit 0

# Map event to status
case "$EVENT_NAME" in
  PreToolUse)  STATUS=started   ;;
  PostToolUse) STATUS=completed ;;
  *)           exit 0           ;;
esac

# Strip plugin: prefix if present (e.g. superpowers:brainstorming → brainstorming)
SKILL_CLEAN=$(printf '%s' "$SKILL" | sed 's/^[^:]*://')

curl -s -m 2 -X POST http://localhost:3001/api/event \
  -H "Content-Type: application/json" \
  -d "{\"skill\":\"$SKILL_CLEAN\",\"status\":\"$STATUS\",\"data\":{}}" \
  > /dev/null 2>&1

exit 0
