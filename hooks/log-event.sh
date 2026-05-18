#!/bin/bash
# Usage: ./log-event.sh <skill> <status> [data_json]
SKILL=$1
STATUS=$2
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Strip newlines so multi-line JSON args don't break JSONL format
DATA=$(printf '%s' "${3:-"{}"}" | tr -d '\n\r')
printf '{"timestamp":"%s","skill":"%s","status":"%s","data":%s}\n' \
  "$TIMESTAMP" "$SKILL" "$STATUS" "$DATA" \
  >> "$REPO_ROOT/events.jsonl"
