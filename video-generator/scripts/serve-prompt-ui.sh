#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${1:-4173}"

cd "$SKILL_DIR/assets/prompt-ui"
python3 ./server.py --port "$PORT"
