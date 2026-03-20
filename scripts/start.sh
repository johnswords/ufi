#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
OLLAMA_MODEL="${OLLAMA_MODEL:-glm-4.7-flash:latest}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
PID_FILE=".ufi-demo.pid"
NGROK_PID_FILE=".ufi-ngrok.pid"
TUNNEL=false

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --tunnel) TUNNEL=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

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

echo "=== UFI — Starting Web Demo ==="
echo "  Port:   $PORT"
echo "  Model:  $OLLAMA_MODEL"
echo "  Ollama: $OLLAMA_BASE_URL"
echo "  Tunnel: $TUNNEL"
echo ""

# Start the server in the background
OLLAMA_MODEL="$OLLAMA_MODEL" OLLAMA_BASE_URL="$OLLAMA_BASE_URL" PORT="$PORT" \
  npx tsx packages/web-demo/src/server.ts &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

# Wait for server to be ready
for i in $(seq 1 15); do
  if curl -s -m 1 "http://localhost:$PORT/api/cpt-codes" >/dev/null 2>&1; then
    echo "Demo running at http://localhost:$PORT (PID $SERVER_PID)"
    break
  fi
  sleep 1
done

# Start ngrok tunnel if requested
if [ "$TUNNEL" = true ]; then
  if ! command -v ngrok >/dev/null 2>&1; then
    echo "Error: ngrok not found. Install with: brew install ngrok"
    exit 1
  fi

  if [ -z "${NGROK_API_KEY:-}" ] && [ -z "${NGROK_AUTHTOKEN:-}" ]; then
    echo "Error: NGROK_API_KEY or NGROK_AUTHTOKEN not set. Add to .env file."
    exit 1
  fi

  # Configure ngrok auth if not already set
  if [ -n "${NGROK_API_KEY:-}" ]; then
    ngrok config add-authtoken "$NGROK_API_KEY" >/dev/null 2>&1 || true
  elif [ -n "${NGROK_AUTHTOKEN:-}" ]; then
    ngrok config add-authtoken "$NGROK_AUTHTOKEN" >/dev/null 2>&1 || true
  fi

  echo ""
  echo "Starting ngrok tunnel..."
  ngrok http "$PORT" --log=stdout > /dev/null 2>&1 &
  NGROK_PID=$!
  echo "$NGROK_PID" > "$NGROK_PID_FILE"

  # Wait for ngrok to establish tunnel and get the URL
  sleep 3
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for t in data.get('tunnels', []):
        if t.get('proto') == 'https':
            print(t['public_url'])
            break
    else:
        for t in data.get('tunnels', []):
            print(t.get('public_url', ''))
            break
except:
    pass
" 2>/dev/null || true)

  if [ -n "$NGROK_URL" ]; then
    echo ""
    echo "=========================================="
    echo "  Public URL: $NGROK_URL"
    echo "=========================================="
    echo ""
    echo "Share this URL for external access."
    echo "Note: Anyone with this URL can use the demo."
  else
    echo "Warning: ngrok started but couldn't retrieve public URL."
    echo "Check http://localhost:4040 for the tunnel URL."
  fi
fi

echo ""
echo "Run ./scripts/stop.sh to stop everything."
