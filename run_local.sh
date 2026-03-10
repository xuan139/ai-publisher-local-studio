#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ -f ".env.local" ]; then
  set -a
  source ".env.local"
  set +a
fi

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

.venv/bin/python -m pip install --upgrade pip >/dev/null
.venv/bin/python -m pip install -r requirements.txt >/dev/null

exec .venv/bin/uvicorn api.app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir .
