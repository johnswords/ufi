#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
OLLAMA_MODEL="${OLLAMA_MODEL:-glm-4.7-flash:latest}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
PID_FILE=".ufi-demo.pid"

# Check if already running
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Demo is already running (PID $(cat "$PID_FILE")) at http://localhost:$PORT"
  echo "Run ./scripts/stop.sh to stop it first."
  exit 1
fi

# Verify Ollama is reachable
if ! curl -s -m 3 "$OLLAMA_BASE_URL/api/tags" >/dev/null 2>&1; then
  echo "Warning: Ollama not reachable at $OLLAMA_BASE_URL"
  echo "Start Ollama first, or predictions will fail."
fi

echo "=== UFI MedEnt — Starting Web Demo ==="
echo "  Port:   $PORT"
echo "  Model:  $OLLAMA_MODEL"
echo "  Ollama: $OLLAMA_BASE_URL"
echo ""

# Start the server in the background
OLLAMA_MODEL="$OLLAMA_MODEL" OLLAMA_BASE_URL="$OLLAMA_BASE_URL" PORT="$PORT" \
  npx tsx packages/web-demo/src/server.ts &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

# Wait for server to be ready
for i in $(seq 1 15); do
  if curl -s -m 1 "http://localhost:$PORT/api/cpt-codes" >/dev/null 2>&1; then
    echo ""
    echo "Demo running at http://localhost:$PORT (PID $SERVER_PID)"
    echo "Run ./scripts/stop.sh to stop."
    exit 0
  fi
  sleep 1
done

echo "Warning: Server started but not responding yet. Check logs."
echo "PID: $SERVER_PID"
