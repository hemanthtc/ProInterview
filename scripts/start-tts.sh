#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(dirname "$DIR")"

SCRIPT_PY="$ROOT_DIR/server/tts/standalone_tts_server.py"

PYTHON_EXE="python3"
if [ -f "$ROOT_DIR/.venv/bin/python" ]; then
    PYTHON_EXE="$ROOT_DIR/.venv/bin/python"
elif [ -f "$ROOT_DIR/venv/bin/python" ]; then
    PYTHON_EXE="$ROOT_DIR/venv/bin/python"
elif command -v python &>/dev/null; then
    PYTHON_EXE="python"
fi

echo "Starting ProInterview Neural TTS on http://127.0.0.1:8001 using $PYTHON_EXE"
exec "$PYTHON_EXE" "$SCRIPT_PY" --port 8001
