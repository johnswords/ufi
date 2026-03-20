#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".ufi-demo.pid"
NGROK_PID_FILE=".ufi-ngrok.pid"
PORT="${PORT:-3000}"

# Stop ngrok tunnel
if [ -f "$NGROK_PID_FILE" ]; then
  NGROK_PID=$(cat "$NGROK_PID_FILE")
  if kill -0 "$NGROK_PID" 2>/dev/null; then
    echo "Stopping ngrok tunnel (PID $NGROK_PID)..."
    kill "$NGROK_PID" 2>/dev/null || true
  fi
  rm -f "$NGROK_PID_FILE"
fi

# Stop demo server
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping UFI demo (PID $PID)..."
    kill "$PID" 2>/dev/null
    for i in $(seq 1 5); do
      if ! kill -0 "$PID" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" 2>/dev/null
    fi
    echo "Stopped."
  else
    echo "Process $PID not running (stale PID file)."
  fi
  rm -f "$PID_FILE"
else
  PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "No PID file found. Killing process(es) on port $PORT..."
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo "Stopped."
  else
    echo "UFI demo is not running."
  fi
fi
