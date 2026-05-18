#!/bin/bash
# Usage: ./log-event.sh <skill> <status> [data_json]
SKILL=$1
STATUS=$2
DATA=${3:-"{}"}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "{\"timestamp\":\"$TIMESTAMP\",\"skill\":\"$SKILL\",\"status\":\"$STATUS\",\"data\":$DATA}" \
  >> "$REPO_ROOT/events.jsonl"
